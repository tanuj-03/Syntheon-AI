# Syntheon AI

An intelligent meeting management platform that transforms conversations into software through automated transcription, specification extraction, and code generation.

## 🚀 Features

### Web Application

- **Dashboard**: Central hub for managing meetings, projects, and extracted specifications
- **Meeting Management**: View and organize meetings with detailed transcripts and metadata
- **Spec Blocks**: Automatically extracted specifications, features, and action items from meetings
- **Project Management**: Link meetings to projects for comprehensive development tracking
- **Code Generation**: AI-powered code generation with GitHub integration
- **Deployment**: Automatic deployment to GitHub Pages with live previews
- **Meeting Context Transfer (MCT)**: Follow-up meetings build on existing project context

### Browser Extension

- **Multi-Platform Support**: Works with Google Meet, Zoom, and Microsoft Teams
- **Bot Integration**: Sends AI bot to meetings for automatic recording
- **Real-time Transcription**: Captures and transcribes meeting audio
- **Seamless Sync**: Automatically syncs with web application via webhooks

## 🛠 Tech Stack

### Frontend

- **Next.js 16.1.6** - React framework with App Router
- **React 19.2.4** - UI library with hooks
- **TypeScript 5.7.3** - Type-safe development
- **TailwindCSS 4.2.0** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **D3.js** - Data visualization for pipeline graphics

### Backend & Services

- **Skribby SDK** - Meeting bot and transcription service
- **Groq SDK** - AI model integration for spec extraction
- **Supabase** - Database and authentication
- **Clerk** - User authentication and management
- **GitHub API** - Code repository integration
- **Linear API** - Project management integration

### Browser Extension

- **Manifest V3** - Modern Chrome extension API
- **Content Scripts** - Injects functionality into meeting platforms
- **Background Service Worker** - Handles background tasks and communication

## 📋 Pages & Routes

### Main Pages

- **Landing Page** (`/`) - Marketing and feature overview
- **Dashboard** (`/dashboard`) - Main application interface
- **Pricing** (`/pricing`) - Subscription plans and billing
- **How It Works** (`/how-it-works`) - Feature documentation
- **Legal** (`/legal`) - Privacy policy, terms, DPA, refund policy

### API Routes

- **Bot Webhook** (`/api/bot/webhook`) - Receives meeting status updates
- **Ship Plan** (`/api/ship/plan`) - Generates development plans
- **Ship Execute** (`/api/ship/execute`) - Executes code generation
- **Authentication** - Sign-in, sign-up, and user management

## 🚀 Installation

### Prerequisites

- Node.js 18+
- npm or pnpm
- Google Chrome (for browser extension)
- GitHub account (for code integration)
- Linear account (for project management)

### Web Application Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/Syntheon-AI.git
   cd Syntheon-AI
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Add your API keys:

   ```env
   # AI Services
   GROQ_API_KEY=your_groq_api_key_here
   SKRIBBY_API_KEY=your_skribby_api_key_here

   # Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key

   # Database
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Analytics
   NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_vercel_analytics_id
   ```

4. **Run the development server**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Browser Extension Setup

1. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" in the top right

2. **Load the extension**
   - Click "Load unpacked"
   - Select the `syntheon-extension` directory

3. **Configure extension**
   - Click the extension icon in your browser toolbar
   - Enter your API keys and backend URL
   - Save configuration

## 📖 Usage

### Recording a Meeting

1. **Join a meeting** on Google Meet, Zoom, or Teams
2. **Start the extension** by clicking the Syntheon AI icon
3. **Send bot to meeting** - The AI bot will join as a participant
4. **Meeting runs normally** - Bot records and transcribes automatically
5. **View results** in the web application dashboard

### Managing Projects

1. **Create projects** in the dashboard to organize related meetings
2. **Link meetings** to projects for context tracking
3. **Review spec blocks** extracted from each meeting
4. **Approve specifications** you want to implement
5. **Generate code** with AI assistance
6. **Deploy automatically** to GitHub Pages

### Using Meeting Context Transfer (MCT)

1. **Complete initial meeting** and generate code
2. **Schedule follow-up meeting** for additional features
3. **Bot joins with full context** of previous work
4. **Generate only delta changes** - no full rewrites
5. **Maintain project continuity** across multiple sessions

## 🔧 Configuration

### Environment Variables

| Variable                            | Description                      | Required |
| ----------------------------------- | -------------------------------- | -------- |
| `GROQ_API_KEY`                      | Groq API key for AI processing   | Yes      |
| `SKRIBBY_API_KEY`                   | Skribby API key for meeting bots | Yes      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key for auth        | Yes      |
| `CLERK_SECRET_KEY`                  | Clerk secret key for auth        | Yes      |
| `NEXT_PUBLIC_SUPABASE_URL`          | Supabase database URL            | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Supabase anonymous key           | Yes      |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_ID`   | Vercel analytics ID              | Optional |

### Service Setup

#### Skribby Setup

1. Sign up at [Skribby](https://platform.skribby.io)
2. Create a new project
3. Generate an API key
4. Add webhook URL: `https://your-domain.com/api/bot/webhook`

#### Groq Setup

1. Sign up at [Groq](https://groq.com)
2. Create an API key
3. Add key to your `.env.local` file

#### GitHub Integration

1. Create a GitHub App or Personal Access Token
2. Configure repository permissions
3. Add webhook for deployment notifications

#### Linear Integration

1. Create a Linear API token
2. Configure workspace access
3. Set up project templates

## 📁 Project Structure

```
Syntheon-AI/
├── app/                    # Next.js app router pages
│   ├── dashboard/           # Main dashboard interface
│   ├── api/               # API routes
│   │   ├── bot/          # Bot webhook handlers
│   │   └── ship/         # Code generation routes
│   ├── page.tsx           # Landing page
│   ├── pricing.tsx         # Pricing page
│   ├── how-it-works/     # Documentation
│   ├── legal/             # Legal documents
│   └── layout.tsx         # Root layout
├── components/             # React components
│   ├── ui/               # Reusable UI components
│   ├── sidebar.tsx        # Navigation sidebar
│   ├── meeting-cards.tsx  # Meeting display cards
│   └── spec-blocks/      # Specification components
├── lib/                   # Utility libraries
│   ├── groq.ts           # AI processing
│   ├── skribby.ts        # Bot integration
│   ├── supabase.ts        # Database client
│   ├── db.ts              # Database utilities
│   └── shipai/           # Code generation logic
├── syntheon-extension/    # Browser extension
│   ├── manifest.json      # Extension configuration
│   ├── content.js         # Meeting platform integration
│   ├── background.js      # Background service worker
│   ├── popup/            # Extension popup UI
│   └── icons/            # Extension icons
├── public/                # Static assets
│   ├── logo.png          # Application logo
│   ├── icon.svg          # Favicon
│   └── apple-icon.png    # Apple touch icon
├── hooks/                 # Custom React hooks
├── styles/                # Global styles
└── db.json               # Local database file
```

## 🔄 Data Flow

1. **Bot joins meeting** via extension command
2. **Audio capture** and real-time transcription by Skribby
3. **Webhook notification** sent to `/api/bot/webhook`
4. **Transcript processing** by Groq for spec extraction
5. **Database storage** of meetings, specs, and projects
6. **AI code generation** based on approved specifications
7. **GitHub integration** for branch creation and PR management
8. **Linear integration** for ticket creation and project tracking
9. **Automatic deployment** to GitHub Pages with live preview

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request with detailed description

## 🐛 Troubleshooting

### Common Issues

**Extension not loading**

- Ensure Developer mode is enabled in Chrome
- Check that extension path is correct
- Verify manifest.json syntax and permissions

**Bot not joining meetings**

- Verify Skribby API key is valid
- Check webhook URL configuration
- Ensure meeting platform is supported

**Code generation failing**

- Check Groq API quota and usage limits
- Verify GitHub repository permissions
- Ensure Linear workspace is properly configured

**Deployment issues**

- Check GitHub Pages settings
- Verify build process completes successfully
- Ensure environment variables are correctly set

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Skribby](https://platform.skribby.io) for meeting bot and transcription services
- [Groq](https://groq.com) for AI model services
- [Supabase](https://supabase.com) for database and authentication
- [Clerk](https://clerk.com) for user management
- [Radix UI](https://radix-ui.com) for accessible components
- [TailwindCSS](https://tailwindcss.com) for styling utilities
- [Vercel](https://vercel.com) for hosting and analytics
