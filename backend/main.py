from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import google.generativeai as genai
import os
import tempfile
import PyPDF2
from typing import List, Dict, Any
import json
from pydantic import BaseModel
from dotenv import load_dotenv
import aiofiles

load_dotenv()

app = FastAPI(title="GenAI Document Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        os.getenv("FRONTEND_URL"),
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class QuestionRequest(BaseModel):
    question: str
    document_id: str
    conversation_history: list = []


class ChallengeAnswer(BaseModel):
    answer: str
    question: str
    document_id: str


class DocumentStore:
    def __init__(self):
        self.documents = {}
        self.conversations = {}

    def store_document(self, doc_id: str, content: str, filename: str):
        self.documents[doc_id] = {"content": content, "filename": filename}
        self.conversations[doc_id] = []

    def add_conversation(
        self, doc_id: str, question: str, answer: str, source_snippet: str = ""
    ):
        if doc_id in self.conversations:
            self.conversations[doc_id].append(
                {
                    "question": question,
                    "answer": answer,
                    "source_snippet": source_snippet,
                    "timestamp": __import__("datetime").datetime.now().isoformat(),
                }
            )

    def get_conversation_history(self, doc_id: str):
        return self.conversations.get(doc_id, [])

    def get_document(self, doc_id: str):
        return self.documents.get(doc_id)


doc_store = DocumentStore()


async def extract_text_from_pdf(file_path: str) -> str:
    try:
        with open(file_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")


async def extract_text_from_txt(file_path: str) -> str:
    try:
        async with aiofiles.open(file_path, "r", encoding="utf-8") as file:
            content = await file.read()
        return content.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading TXT file: {str(e)}")


async def generate_summary(content: str) -> str:
    prompt = f"""
    Please provide a concise summary of the following document in no more than 150 words. 
    Focus on the main points, key findings, and essential information:

    {content}
    """

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating summary: {str(e)}"
        )


async def answer_question(
    question: str, content: str, conversation_history: list = []
) -> dict:
    context_prompt = ""
    if conversation_history:
        context_prompt = "\n\nPrevious conversation context:\n"
        for i, conv in enumerate(
            conversation_history[-3:]
        ):
            context_prompt += f"Q{i+1}: {conv['question']}\nA{i+1}: {conv['answer']}\n"

    prompt = f"""
    Based on the following document, please answer the question with consideration of any previous conversation context.
    
    Document:
    {content}
    {context_prompt}
    
    Current Question: {question}

    Please provide your response in JSON format with the following structure:
    {{
        "answer": "[Your detailed answer here]",
        "justification": "[Specific reference to document content with section/paragraph info]",
        "source_snippet": "[Extract the exact text snippet from the document that supports your answer - maximum 200 characters]",
        "confidence": "[High/Medium/Low based on how well the document supports the answer]"
    }}
    
    Important: The source_snippet should be the exact text from the document that most directly supports your answer.
    """

    try:
        response = model.generate_content(prompt)

        try:
            import json

            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:-3]
            elif response_text.startswith("```"):
                response_text = response_text[3:-3]

            parsed_response = json.loads(response_text)
            return parsed_response
        except:
            return {
                "answer": response.text,
                "justification": "See answer above for document references",
                "source_snippet": "",
                "confidence": "Medium",
            }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error answering question: {str(e)}"
        )


async def generate_challenge_questions(content: str) -> List[str]:
    prompt = f"""
    Based on the following document, generate exactly 3 challenging questions that test:
    1. Deep comprehension and understanding
    2. Logical reasoning and inference
    3. Critical thinking about the content

    The questions should require more than simple recall and should test the reader's ability to analyze, synthesize, and draw conclusions from the document.

    Document:
    {content}

    Please provide exactly 3 questions, numbered 1-3:
    """

    try:
        response = model.generate_content(prompt)
        questions_text = response.text
        questions = []
        lines = questions_text.split("\n")
        for line in lines:
            line = line.strip()
            if line and (
                line.startswith("1.") or line.startswith("2.") or line.startswith("3.")
            ):
                question = line[2:].strip()
                questions.append(question)

        if len(questions) < 3:
            sentences = questions_text.split("?")
            questions = [q.strip() + "?" for q in sentences[:3] if q.strip()]

        return questions[:3]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating challenge questions: {str(e)}"
        )


async def evaluate_answer(user_answer: str, question: str, content: str) -> dict:
    prompt = f"""
    Based on the following document, evaluate the user's answer to the given question.

    Document:
    {content}

    Question: {question}
    User's Answer: {user_answer}

    Please evaluate the answer and provide:
    1. A score from 1-10 (10 being excellent)
    2. Feedback on the answer's accuracy and completeness
    3. The correct/ideal answer with justification from the document
    4. Specific references to document sections that support the evaluation

    Format your response as:
    Score: [1-10]
    Feedback: [Your feedback here]
    Correct Answer: [Ideal answer here]
    Justification: [Document references and explanation]
    """

    try:
        response = model.generate_content(prompt)
        return {"evaluation": response.text}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error evaluating answer: {str(e)}"
        )


@app.get("/")
async def root():
    return {"message": "GenAI Document Assistant API", "version": "1.0.0"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(
            status_code=400, detail="Only PDF and TXT files are supported"
        )

    import uuid

    doc_id = str(uuid.uuid4())

    try:
        temp_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")

        async with aiofiles.open(temp_path, "wb") as temp_file:
            content = await file.read()
            await temp_file.write(content)

        if file.filename.lower().endswith(".pdf"):
            text_content = await extract_text_from_pdf(temp_path)
        else:
            text_content = await extract_text_from_txt(temp_path)

        if not text_content.strip():
            raise HTTPException(
                status_code=400, detail="No text content found in the document"
            )

        doc_store.store_document(doc_id, text_content, file.filename)

        summary = await generate_summary(text_content)

        os.unlink(temp_path)

        return {
            "document_id": doc_id,
            "filename": file.filename,
            "summary": summary,
            "message": "Document uploaded and processed successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise HTTPException(
            status_code=500, detail=f"Error processing document: {str(e)}"
        )


@app.post("/ask")
async def ask_question(request: QuestionRequest):
    document = doc_store.get_document(request.document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    conversation_history = doc_store.get_conversation_history(request.document_id)

    result = await answer_question(
        request.question, document["content"], conversation_history
    )

    doc_store.add_conversation(
        request.document_id,
        request.question,
        result.get("answer", ""),
        result.get("source_snippet", ""),
    )

    return result


@app.post("/challenge")
async def get_challenge_questions(document_id: str = Form(...)):
    document = doc_store.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    questions = await generate_challenge_questions(document["content"])
    return {"questions": questions}


@app.post("/evaluate")
async def evaluate_challenge_answer(request: ChallengeAnswer):
    document = doc_store.get_document(request.document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    result = await evaluate_answer(
        request.answer, request.question, document["content"]
    )
    return result


@app.get("/document/{document_id}")
async def get_document_info(document_id: str):
    document = doc_store.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": document_id,
        "filename": document["filename"],
        "content_length": len(document["content"]),
    }


@app.get("/conversation/{document_id}")
async def get_conversation_history(document_id: str):
    document = doc_store.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    conversation_history = doc_store.get_conversation_history(document_id)
    return {"document_id": document_id, "conversation_history": conversation_history}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
