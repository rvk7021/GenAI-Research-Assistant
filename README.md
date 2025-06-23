# GenAI Research Assistant

A minimalistic, full-stack application powered by Google Gemini AI to help users upload, summarize, and interact with large documents (PDF/TXT) through natural language Q&A and logic-based challenges.

---

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Run](#setup--run)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture

```text
[ User Browser ]
       |
       v
[ React Frontend ]
       |
   HTTP REST
       |
[ FastAPI Backend ]
       |
   HTTP gRPC
       |
[ Google Gemini AI ]
       |
   JSON Response
       |
[ FastAPI Backend ]
       |
   HTTP REST
       |
[ React Frontend ]
       |
       v
[ User Browser ]

Uploads are stored temporarily in `backend/uploads/`, text is extracted, processed by Gemini AI, and responses are returned with summaries, answers, justifications, and confidence scores.
```

---

## Features

- **Document Upload**: Upload PDF or TXT files via browser
- **Auto Summarization**: Get concise summaries (≤150 words)
- **Ask Anything**: Free-form Q&A with memory of previous context
- **Challenge Mode**: AI-generated logic-based questions & evaluation
- **Contextual Justification**: Answers include source snippets and confidence
- **Minimalistic UI**: Clean, responsive design using React + Tailwind CSS

---

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Axios
- **Backend**: FastAPI, Uvicorn, Pydantic
- **AI Service**: Google Gemini AI (`google-generativeai` Python SDK)
- **PDF Processing**: PyPDF2
- **Async I/O**: `aiofiles` for file operations
- **Environment**: Python 3.8+, Node.js 14+

---

## Project Structure

```
Summary-generator/
├── backend/                  # FastAPI service
│   ├── main.py               # API routes & AI integration
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Env variables (Gemini API key)
│   └── uploads/              # Temporary file storage

├── frontend/                 # React application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── index.js          # Entry point
│   │   └── index.css         # Tailwind CSS imports
│   ├── package.json          # Node dependencies & scripts
│   └── tailwind.config.js    # Tailwind setup

└── README.md                 # Project documentation
```

---

## Prerequisites

- **Python**: 3.8 or higher
- **Node.js**: 14 or higher
- **npm** or **yarn**

---

## Setup & Run

### Backend

```bash
cd backend
# Install Python packages
pip install -r requirements.txt

# Create .env with your Gemini API key
# echo GEMINI_API_KEY=your_key > .env

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
# Install Node packages
npm install

# Start React development server
npm start
```

App will be available at `http://localhost:3000`.

---

## Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini AI API key
- `UPLOAD_DIR` (optional): Custom directory for uploads
- `MAX_FILE_SIZE` (optional): Max upload size in bytes

---

## API Endpoints

### Document Operations

| Method | Endpoint                  | Description                      |
| ------ | ------------------------- | -------------------------------- |
| POST   | `/upload`                 | Upload & process a document      |
| GET    | `/document/{document_id}` | Retrieve document metadata       |
| GET    | `/conversation/{doc_id}`  | Fetch Q&A history                |

### Interaction Modes

| Method | Endpoint     | Description                         |
| ------ | ------------ | ----------------------------------- |
| POST   | `/ask`       | Ask a free-form question            |
| POST   | `/challenge` | Generate logic-based challenge Qs    |
| POST   | `/evaluate`  | Evaluate user's challenge answers   |

---

## Usage

1. Open `http://localhost:3000`
2. Upload a PDF/TXT document
3. View automatic summary
4. Switch to **Ask Anything** for Q&A
5. Switch to **Challenge Mode** for comprehension tests

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit changes (`git commit -m "feat: add ..."`)
4. Push to branch and submit PR

---

## License

This project is licensed under the [MIT License](LICENSE).
