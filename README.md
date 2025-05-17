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
