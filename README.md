# Trade Journal Application

A modern trading journal application built with Next.js, React, and Supabase. Track your trades, analyze your performance, and improve your trading strategy with AI-powered insights.

## Features

- 📊 **Trade Tracking**: Log and manage your trading activities
- 📅 **Calendar View**: Visualize your trades on a calendar
- 📈 **Performance Analytics**: Track your trading performance with detailed metrics
- 🤖 **AI Insights**: Get AI-powered analysis of your trading patterns
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🔒 **Secure Authentication**: Powered by Supabase

## Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **State Management**: React Context + SWR
- **Charts**: Recharts, Tremor
- **Styling**: TailwindCSS
- **Animation**: Framer Motion
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/trade-journal.git
   cd trade-journal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/         # React components
│   ├── ai/            # AI-related components
│   ├── analytics/     # Analytics components
│   ├── calendar/      # Calendar components
│   ├── common/        # Shared components
│   ├── dashboard/     # Dashboard components
│   └── trades/        # Trade-related components
├── lib/               # Utilities and API functions
├── hooks/             # Custom React hooks
├── providers/         # Context providers
├── styles/           # Global styles
└── types/            # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [TailwindCSS](https://tailwindcss.com/)
- [Tremor](https://www.tremor.so/)
- [Recharts](https://recharts.org/)

---

# 🚀 Production Deployment Checklist

## 1. Authentication & Security
- [ ] Require authentication for all trade uploads (verify Supabase JWT in `/api/trades/upload`)
- [ ] Always set and store `user_id` for every trade (extension must send JWT or user_id)
- [ ] Enable Row Level Security (RLS) in Supabase for the `trades` table
- [ ] Remove any code that fetches all trades without filtering by user_id

## 2. CORS & API Security
- [ ] Restrict CORS in production: set `Access-Control-Allow-Origin` to your real domain
- [ ] Only allow necessary methods and headers
- [ ] Handle preflight (OPTIONS) requests properly

## 3. Environment Variables & Secrets
- [ ] Use production Supabase credentials in your deployment environment
- [ ] Never commit secrets or private keys to your repo

## 4. File Uploads & Storage
- [ ] Store videos in a scalable, secure location (Supabase Storage, S3, etc.)
- [ ] Set file size/type limits in your upload handler

## 5. Frontend Filtering & Data Fetching
- [ ] All frontend pages must only show trades for the logged-in user (filter by user_id)
- [ ] Remove any test/dev code that disables user filtering

## 6. Chrome Extension
- [ ] Ensure the extension always sends the JWT with uploads
- [ ] Publish the extension to the Chrome Web Store (optional)

## 7. Testing
- [ ] Test the full flow as a real user (login, upload, view, fail cases)
- [ ] Test on production domain and with production Supabase

## 8. Performance & Monitoring
- [ ] Enable error logging and monitoring (Sentry, LogRocket, etc.)
- [ ] Optimize images, videos, and static assets

## 9. Legal & Compliance
- [ ] Add a privacy policy and terms of service

## 10. Deployment
- [ ] Build and deploy your Next.js app to your chosen host
- [ ] Set environment variables in your deployment dashboard
- [ ] Verify HTTPS is enabled

# ✅ Final Pre-Launch Checklist
- [ ] All endpoints require authentication
- [ ] All trades have a valid `user_id`
- [ ] RLS is enabled and tested
- [ ] CORS is restricted to your domain
- [ ] No test/dev code remains
- [ ] File uploads are secure and scalable
- [ ] All user data is private and secure
- [ ] Full flow tested as a real user

---
