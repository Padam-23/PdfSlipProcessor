# PDF Slip Processor - SaaS Application

A production-ready SaaS web application for processing postal bank slips and deposit installment reports.

## Tech Stack

### Frontend
- Next.js 14 + TypeScript
- Tailwind CSS
- Shadcn UI components
- Framer Motion

### Backend
- Node.js + Express
- Python microservice for PDF processing

### Database
- Supabase PostgreSQL

### PDF Processing
- PyMuPDF (fitz)
- Pillow (PIL)
- OpenCV
- NumPy

## Project Structure

```
.
├── frontend/                # Next.js frontend
│   ├── app/
│   │   ├── dashboard/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   ├── package.json
│   └── ...
├── backend/                 # Express backend
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── python/              # PDF processing microservice
│   ├── temp/
│   ├── uploads/
│   ├── output/
│   ├── package.json
│   └── server.js
├── supabase-schema.sql      # Database schema
└── README.md
```

## Setup Instructions

### 1. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com/)
2. Go to SQL Editor and run `supabase-schema.sql`
3. Copy your project URL, anon key, and service role key

### 2. Backend Setup

```bash
cd backend
npm install

# Install Python dependencies
cd python
pip install -r requirements.txt
cd ..

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy and configure environment variables
cp .env.local.example .env.local
# Edit .env.local with your API URL
```

### 4. Run the Application

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Database Schema

### users Table
- `id` (UUID, Primary Key)
- `email` (Text, Unique)
- `password_hash` (Text)
- `pdf_limit` (Integer, Default 100)
- `pdf_used` (Integer, Default 0)
- `plan_expiry` (Timestamp)
- `is_active` (Boolean)
- `created_at` (Timestamp)

### processing_logs Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `pdf_count` (Integer)
- `processing_time` (Numeric)
- `processed_at` (Timestamp)

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Upload
- `POST /upload/slips` - Upload slip PDF
- `POST /upload/reports` - Upload report PDF

### Processing
- `POST /process` - Process uploaded PDFs

### Usage
- `GET /usage` - Get user's usage stats

## PDF Processing Workflow

1. **Slip PDF Processing:**
   - Convert each page to high-quality image
   - Crop using exact coordinates
   - Remove denomination section
   - Save as lossless PNG

2. **Report PDF Processing:**
   - Auto-detect content area using OpenCV
   - Remove white margins
   - Save as PNG

3. **Merge Outputs:**
   - Combine matching slip and report files
   - Create professional formatted page
   - Generate final_output.pdf

## Deployment

### Frontend (Vercel)

1. Push frontend code to GitHub
2. Import repository in Vercel
3. Set environment variables
4. Deploy

### Backend (Railway/Render)

1. Push backend code to GitHub
2. Import repository in Railway/Render
3. Set environment variables
4. Deploy

### Environment Variables

**Backend (.env):**
```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=your_backend_url
```

## Features

- Secure email/password authentication with bcrypt
- JWT-based authentication
- Protected dashboard
- Monthly usage limit system (100 PDFs per user)
- Drag-and-drop file upload
- Professional responsive UI with animations
- High-quality PDF processing pipeline
- Auto temp file cleanup

## License

MIT