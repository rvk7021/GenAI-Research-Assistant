import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [document, setDocument] = useState(null);
  const [summary, setSummary] = useState('');
  const [activeMode, setActiveMode] = useState('upload');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [challengeQuestions, setChallengeQuestions] = useState([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [loading, setLoading] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationPage, setConversationPage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const CONVERSATIONS_PER_PAGE = 10;
  const totalPages = Math.ceil(conversationHistory.length / CONVERSATIONS_PER_PAGE);
  const paginatedConversations = conversationHistory.slice(
    conversationPage * CONVERSATIONS_PER_PAGE,
    (conversationPage + 1) * CONVERSATIONS_PER_PAGE
  );

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.txt')) {
      setError('Please select a PDF or TXT file');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setDocument(data);
      setSummary(data.summary);
      setActiveMode('summary');

      // Load conversation history for this document
      setTimeout(() => {
        loadConversationHistory();
      }, 500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const loadConversationHistory = async () => {
    if (!document) return;

    try {
      const response = await fetch(`${API_BASE_URL}/conversation/${document.document_id}`);
      const data = await response.json();
      setConversationHistory(data.conversation_history || []);
    } catch (err) {
      console.log('Could not load conversation history:', err);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !document) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          document_id: document.document_id,
          conversation_history: conversationHistory
        }),
      });

      if (!response.ok) {
        throw new Error('Question failed');
      }

      const data = await response.json();
      setAnswer(data);

      // Add to local conversation history
      const newConversation = {
        question: question,
        answer: data.answer,
        source_snippet: data.source_snippet || '',
        confidence: data.confidence || 'Medium',
        timestamp: new Date().toISOString()
      };
      setConversationHistory(prev => [newConversation, ...prev]);

      // Clear the question input
      setQuestion('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error asking question');
    } finally {
      setLoading(false);
    }
  };

  const handleGetChallengeQuestions = async () => {
    if (!document) return;

    setChallengeLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('document_id', document.document_id);

    try {
      const response = await fetch(`${API_BASE_URL}/challenge`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Challenge generation failed');
      }

      const data = await response.json();
      setChallengeQuestions(data.questions);
      setCurrentChallengeIndex(0);
      setUserAnswer('');
      setEvaluation('');
      setActiveMode('challenge');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error generating challenge questions');
    } finally {
      setChallengeLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !challengeQuestions.length) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer: userAnswer,
          question: challengeQuestions[currentChallengeIndex],
          document_id: document.document_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Evaluation failed');
      }

      const data = await response.json();
      setEvaluation(data.evaluation);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error evaluating answer');
    } finally {
      setLoading(false);
    }
  };

  const nextChallengeQuestion = () => {
    if (currentChallengeIndex < challengeQuestions.length - 1) {
      setCurrentChallengeIndex(currentChallengeIndex + 1);
      setUserAnswer('');
      setEvaluation('');
    }
  };

  const previousChallengeQuestion = () => {
    if (currentChallengeIndex > 0) {
      setCurrentChallengeIndex(currentChallengeIndex - 1);
      setUserAnswer('');
      setEvaluation('');
    }
  };

  // Icons
  const UploadIcon = () => (
    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );

  const DocumentIcon = () => (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const BrainIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );

  const TargetIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );

  const ChevronLeftIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  const MenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  const XIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Challenge Loading Overlay */}
      {challengeLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 sm:p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="inline-flex items-center space-x-3 mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                <span className="text-lg text-gray-300">Generating Challenges...</span>
              </div>
              <p className="text-sm text-gray-400">Please wait while we create personalized questions for you.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Mobile Menu Button */}
            {document && conversationHistory.length > 0 && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                {sidebarOpen ? <XIcon /> : <MenuIcon />}
              </button>
            )}

            {/* Logo */}
            <div className="flex items-center space-x-3 flex-1 lg:flex-initial justify-center lg:justify-start">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
                <DocumentIcon />
              </div>
              <h1 className="text-xl font-semibold text-white">
                Document Assistant
              </h1>
            </div>

            {/* Spacer for mobile */}
            <div className="w-10 lg:hidden"></div>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen pt-16">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar - Conversation History */}
        {document && conversationHistory.length > 0 && (
          <div className={`
            fixed lg:static inset-y-0 left-0 z-30 lg:z-0
            w-80 bg-gray-800 border-r border-gray-700 flex flex-col
            transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
            transition-transform duration-300 ease-in-out
            pt-16 lg:pt-0
          `}>
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-2">Conversation History</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium truncate">{document.filename}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {paginatedConversations.map((conv, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="font-medium text-purple-300 mb-1 text-sm line-clamp-2">
                    Q: {conv.question}
                  </div>
                  <div className="text-gray-300 text-xs line-clamp-2">
                    A: {conv.answer?.substring(0, 80)}...
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${conv.confidence === 'High' ? 'bg-green-900 text-green-300' :
                        conv.confidence === 'Medium' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-red-900 text-red-300'
                      }`}>
                      {conv.confidence}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(conv.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setConversationPage(Math.max(0, conversationPage - 1))}
                    disabled={conversationPage === 0}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon />
                    <span>Prev</span>
                  </button>

                  <span className="text-sm text-gray-400">
                    {conversationPage + 1} of {totalPages}
                  </span>

                  <button
                    onClick={() => setConversationPage(Math.min(totalPages - 1, conversationPage + 1))}
                    disabled={conversationPage === totalPages - 1}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            {/* Navigation */}
            {document && (
              <nav className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 mb-6 sm:mb-8 p-1 bg-gray-800 rounded-lg w-full sm:w-fit mx-auto">
                {[
                  { id: 'summary', label: 'Summary', icon: DocumentIcon },
                  { id: 'ask', label: 'Ask', icon: BrainIcon },
                  { id: 'challenge', label: 'Challenge', icon: TargetIcon, onClick: handleGetChallengeQuestions }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={mode.onClick || (() => setActiveMode(mode.id))}
                    disabled={challengeLoading && mode.id === 'challenge'}
                    className={`flex items-center justify-center sm:justify-start space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${activeMode === mode.id
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                  >
                    <mode.icon />
                    <span>{mode.label}</span>
                  </button>
                ))}
              </nav>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Section */}
            {activeMode === 'upload' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="text-center max-w-md mx-auto">
                    <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                      Upload Document
                    </h2>
                    <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
                      Upload a PDF or TXT file to get started with AI analysis
                    </p>

                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 sm:p-8 hover:border-purple-500 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <UploadIcon />
                          <p className="mt-4 text-sm font-medium text-white">
                            Choose file or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PDF or TXT up to 10MB
                          </p>
                        </div>
                      </label>
                    </div>

                    {loading && (
                      <div className="mt-6 flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                        <span className="text-sm text-gray-400">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Summary Section */}
            {activeMode === 'summary' && summary && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
                <div className="p-4 sm:p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Document Summary
                  </h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 leading-relaxed text-sm sm:text-base">{summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Ask Section */}
            {activeMode === 'ask' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
                  <div className="p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">
                      Ask Questions
                    </h2>

                    <div className="space-y-4">
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask any question about the document..."
                        className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-white placeholder-gray-400 text-sm sm:text-base"
                        rows="3"
                      />

                      <button
                        onClick={handleAskQuestion}
                        disabled={loading || !question.trim()}
                        className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Processing...' : 'Ask Question'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Answer Display */}
                {answer && typeof answer === 'object' && (
                  <div className="space-y-4">
                    {/* Main Answer */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
                      <div className="p-4 sm:p-6">
                        <h3 className="text-base font-semibold text-white mb-3">Answer</h3>
                        <div className="prose prose-invert max-w-none">
                          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{answer.answer}</p>
                        </div>
                      </div>
                    </div>

                    {/* Supporting Information */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {/* Source Snippet */}
                      {answer.source_snippet && (
                        <div className="bg-amber-900/30 rounded-xl border border-amber-700">
                          <div className="p-4">
                            <h4 className="text-sm font-semibold text-amber-300 mb-2">Source Text</h4>
                            <p className="text-sm text-amber-200 italic">"{answer.source_snippet}"</p>
                          </div>
                        </div>
                      )}

                      {/* Confidence & Justification */}
                      <div className="space-y-4">
                        <div className="bg-gray-700 rounded-xl border border-gray-600">
                          <div className="p-4">
                            <h4 className="text-sm font-semibold text-gray-200 mb-2">Confidence</h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${answer.confidence === 'High' ? 'bg-green-900 text-green-300' :
                                answer.confidence === 'Medium' ? 'bg-yellow-900 text-yellow-300' :
                                  'bg-red-900 text-red-300'
                              }`}>
                              {answer.confidence}
                            </span>
                          </div>
                        </div>

                        <div className="bg-blue-900/30 rounded-xl border border-blue-700">
                          <div className="p-4">
                            <h4 className="text-sm font-semibold text-blue-300 mb-2">Reasoning</h4>
                            <p className="text-sm text-blue-200">{answer.justification}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Simple answer fallback */}
                {answer && typeof answer === 'string' && (
                  <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
                    <div className="p-4 sm:p-6">
                      <h3 className="text-base font-semibold text-white mb-3">Answer</h3>
                      <div className="prose prose-invert max-w-none">
                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{answer}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Challenge Mode */}
            {activeMode === 'challenge' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
                <div className="p-4 sm:p-6">
                  {challengeQuestions.length > 0 ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-2 sm:space-y-0">
                        <h2 className="text-lg font-semibold text-white">Challenge Mode</h2>
                        <span className="text-sm text-gray-400">
                          {currentChallengeIndex + 1} of {challengeQuestions.length}
                        </span>
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
                          <h3 className="text-sm font-semibold text-blue-300 mb-2">Question</h3>
                          <p className="text-blue-200 text-sm sm:text-base">{challengeQuestions[currentChallengeIndex]}</p>
                        </div>

                        <textarea
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-white placeholder-gray-400 text-sm sm:text-base"
                          rows="4"
                        />

                        <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                            <button
                              onClick={previousChallengeQuestion}
                              disabled={currentChallengeIndex === 0}
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronLeftIcon />
                              <span>Previous</span>
                            </button>

                            <button
                              onClick={nextChallengeQuestion}
                              disabled={currentChallengeIndex === challengeQuestions.length - 1}
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>Next</span>
                              <ChevronRightIcon />
                            </button>
                          </div>

                          <button
                            onClick={handleSubmitAnswer}
                            disabled={loading || !userAnswer.trim()}
                            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Evaluating...' : 'Submit Answer'}
                          </button>
                        </div>

                        {/* Evaluation Display */}
                        {evaluation && (
                          <div className="mt-6 bg-green-900/30 rounded-lg p-4 border border-green-700">
                            <h4 className="text-sm font-semibold text-green-300 mb-2">Evaluation</h4>
                            <p className="text-green-200 text-sm sm:text-base whitespace-pre-wrap">{evaluation}</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <h2 className="text-lg font-semibold text-white mb-4">Challenge Mode</h2>
                      <p className="text-gray-400 mb-6">
                        Generate personalized questions to test your understanding of the document.
                      </p>
                      <button
                        onClick={handleGetChallengeQuestions}
                        disabled={challengeLoading}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {challengeLoading ? 'Generating...' : 'Generate Challenge Questions'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;