# DocBot - Intelligent Document Analysis Chatbot

**A powerful AI-powered document analysis system that reads and analyzes Word, Excel, PDF documents, and web content in real-time.**

DocBot helps developers, researchers, and teams quickly extract key information from lengthy documents without manually scanning through them. With an intuitive chat interface and browser extension, you can query documents conversationally and get instant insights.

## 🚀 Key Features

### 📄 Document Processing
- **Multiple Format Support**: Word (.docx), Excel (.xlsx), PDF files, and web content
- **Real-time Analysis**: Automatically detect and process active documents on Windows
- **Text Extraction**: Advanced text extraction with support for complex document structures
- **Document Upload**: Direct file upload via web interface and browser extension
  
  <img width="290" height="440" alt="upload pdf" src="https://github.com/user-attachments/assets/a98ed0e4-2b2b-46dd-a4ce-e7d5618d0504" />

- **Document Comparison**: Side-by-side comparison of two documents with AI-powered change analysis
  <img width="960" height="476" alt="comparison doc" src="https://github.com/user-attachments/assets/0575de60-a2fd-4291-9333-7ceb819ec707" />


### 🤖 AI-Powered Chat Interface
- **Natural Language Queries**: Ask questions about documents in plain English
  
  <img width="289" height="439" alt="ChatBot interface" src="https://github.com/user-attachments/assets/05dabe3e-3dcb-4e8c-ae58-a399963ddc60" />
- **Summaries**: Get concise bullet-point summary for the document/web page.
  <img width="299" height="443" alt="auto-suggested-questions" src="https://github.com/user-attachments/assets/8c5b2765-7f53-4619-b044-5cd9f01d8198" />

- **Context-Aware Responses**: AI understands document context and provides relevant answers
- **Auto-suggestions**: Smart question suggestions based on document content
  <img width="299" height="443" alt="auto-suggested-questions" src="https://github.com/user-attachments/assets/0b51c3d3-baed-46de-8260-286423e392ee" />

- **Explain Tooltip**: Select any text to get simplified explanations
  <img width="490" height="427" alt="Explain tooltip" src="https://github.com/user-attachments/assets/db25f97e-6e8e-4b89-a531-51d75855ce15" />

- **Conversation History**: Maintains chat history per document session. User can also delete history for the current session.
  <img width="293" height="436" alt="clear history" src="https://github.com/user-attachments/assets/f720bac1-7db9-432a-897c-37011be90085" />

### 🌐 Browser Extension (DocBot)
- **Web Document Analysis**: Works with Google Docs, Word Online, PDF viewers, and any web content
- **In-page Chat**: Chat overlay directly on web pages
- **Document Notes**: Save and organize notes with timestamps and topics
  <img width="284" height="436" alt="notes docbot" src="https://github.com/user-attachments/assets/d6f5b466-f5fd-44fc-97af-39e3d59e426f" />

- **Export Capabilities**: Export notes, summary, chat history and comparisons to PDF
- **Cross-platform Support**: Chrome and Edge compatible (Manifest V3)

### 🔐 Security & Authentication
- **JWT-based Authentication**: Secure token-based authentication system
- **Local Processing**: Documents processed locally for privacy
- **CORS Support**: Configured for local development and extension integration
- **Environment Variables**: Secure API key management

### 💻 Modern Tech Stack

#### Backend (Python/FastAPI)
- **FastAPI**: High-performance web framework with automatic API documentation
- **Google Gemini AI**: Advanced AI capabilities with `gemini-2.0-flash` model
- **Document Libraries**: 
  - `python-docx` for Word documents
  - `openpyxl` for Excel files
  - `pdfplumber` for PDF processing
- **Windows Integration**: 
  - `pygetwindow` for window detection
  - `pywin32` for COM automation
  - `psutil` for process management
- **Security**: `passlib` with bcrypt for password hashing, `PyJWT` for tokens

#### Frontend (React/Vite)
- **React 18**: Modern React with hooks and functional components
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework with form components
- **Responsive Design**: Mobile-friendly interface

#### Browser Extension
- **Manifest V3**: Latest Chrome extension standards
- **Content Security Policy**: Secure extension permissions
- **Service Worker**: Background processing for document analysis
- **Storage API**: Persistent storage for notes and highlights

## 🛠️ Installation & Setup

### Prerequisites
- **Python 3.8+**
- **Node.js 16+** (for frontend development)
- **Windows OS** (for desktop document detection features)
- **Google Gemini API Key**

### Backend Setup

1. **Clone the repository**:
   ```powershell
   git clone <repository-url>
   cd requirements_analyser
   ```

2. **Create and activate Python virtual environment**:
   ```powershell
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Install Python dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```powershell
   # Set your Gemini API key
   setx GEMINI_API_KEY "your-gemini-api-key-here"
   
   # Set JWT secret for authentication
   setx JWT_SECRET "choose-a-strong-secret-key"
   ```

5. **Run the backend server**:
   ```powershell
   uvicorn backend.main:app --reload
   ```

   The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`

### 🌐 Azure Cloud Deployment

**Production URL**: [https://cts-vibeappau3702-2.azurewebsites.net](https://cts-vibeappau3702-2.azurewebsites.net)
**Swagger Definition**: [https://cts-vibeappau3702-2.azurewebsites.net/docs](https://cts-vibeappau3702-2.azurewebsites.net/docs)

DocBot is deployed on Azure App Service for production use. The browser extension automatically uses this deployed endpoint as the default API base, with fallback to localhost for development.

#### Key Features of Azure Deployment:
- **Auto-scaling**: Handles variable user loads automatically
- **Global availability**: Accessible from anywhere with internet connection
- **SSL/HTTPS**: Secure encrypted connections
- **Integrated monitoring**: Built-in health checks and logging
- **CI/CD pipeline**: Automated deployment from repository updates

The extension intelligently switches between:
1. Custom API URL (if configured in extension settings)
2. **Production Azure URL** (default): `https://cts-vibeappau3702-2.azurewebsites.net`
3. Local development URL: `http://localhost:8000`

### Frontend Setup (Optional - for web interface)

1. **Navigate to frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Start development server**:
   ```powershell
   npm run dev
   ```

   The web interface will be available at `http://localhost:5173`

### Browser Extension Setup

1. **Get a Gemini API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Load the extension**:
   - Open Chrome/Edge and go to `chrome://extensions` or `edge://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension/` directory

3. **Configure the extension**:
   - Click the DocBot icon in the toolbar
   - Navigate to any web document (Google Docs, PDFs, etc.)
   - Click "Load Document" to extract text
   - Enter your Gemini API key when prompted
   - Start chatting about the document!

## 📖 Usage Guide

### Desktop Application
1. **Authentication**: Login with default credentials (`admin`/`password`)
2. **Load Document**: Click "Read Active Document" to analyze the currently open Word/Excel/PDF file
3. **Chat**: Ask questions about the document content
4. **Get Insights**: Use auto-generated suggestions for common queries

### Browser Extension
1. **Load Content**: Navigate to any web document and click "Load Document"
2. **Chat Interface**: Use the popup chat to ask questions about the page content
3. **Text Selection**: Select any text on the page for instant explanations
4. **Highlighting**: Highlight important sections for later reference
5. **Notes**: Save notes with topics and timestamps
6. **Document Comparison**: Upload two documents to see detailed comparisons

### API Endpoints

#### Authentication
- `POST /auth` - Login and get JWT token

#### Document Processing
- `POST /read-doc` - Read active desktop document
- `POST /upload` - Upload PDF for analysis
- `POST /summarise` - Generate document summary
- `POST /compare` - Compare two documents

#### Chat & Analysis
- `POST /ask` - Ask questions about loaded documents
- `POST /auto-suggestions` - Get smart question suggestions
- `POST /explain` - Get explanations for selected text

#### Notes Management
- `POST /notes` - Save a new note
- `GET /notes` - Retrieve saved notes
- `DELETE /notes/{note_id}` - Delete a specific note

## 🔧 Configuration

### Environment Variables
```bash
GEMINI_API_KEY=your-gemini-api-key    # Required: Google Gemini AI API key
JWT_SECRET=your-jwt-secret            # Required: Secret for JWT token signing
```

### Default Credentials
- **Username**: `admin`
- **Password**: `password`

⚠️ **Important**: Change the default password after first login for production use.

## 🌟 Advanced Features

### Document Comparison
- Upload two documents to see detailed side-by-side comparison
- AI-powered analysis highlights key differences
- Visual indicators for additions, deletions, and modifications
- Export comparison results

### Smart Suggestions
- Context-aware question generation based on document content
- Focuses on deadlines, risks, decisions, and requirements
- Helps users discover important information they might miss

### Text Highlighting & Annotations
- Highlight important text sections in web documents
- Persistent highlights across page refreshes
- Color-coded highlighting system
- Export highlighted content

### Notes System
- Save important insights with timestamps
- Organize notes by topics and documents
- Export notes to PDF format
- Search and filter notes

## 🔒 Privacy & Security

- **Local Processing**: Documents are processed locally on your machine
- **No Data Storage**: Document content is not permanently stored
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **API Security**: Gemini API calls only when explicitly requested
- **Extension Permissions**: Minimal required permissions for browser extension

## 🚀 Development

### Building the Frontend
```bash
cd frontend
npm run build
```

### Running Tests
```bash
# Backend tests
python -m pytest

# Frontend tests
cd frontend
npm test
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🤝 Support

For support, feature requests, or bug reports, please open an issue on the GitHub repository.

---

**DocBot** - Empowering smarter document analysis with AI 🚀
