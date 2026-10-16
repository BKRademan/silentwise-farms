# Farm Workers Management System - Project Plan

> **Transport & PPE status (2026-10-16):** Phases 1 and 2 are complete, merged into `main`,
> deployed to production, and accepted after the user completed testing. The financial year
> starts on 1 March; unknown-employee deductions are intentionally left unchanged.
> See [`docs/plans/phase-2-ppe-invoices.md`](docs/plans/phase-2-ppe-invoices.md) for the current handover.
> This file is the original high-level plan; the app was built with Next.js rather than
> the MUI/Express stack described below.

## 1. Technology Stack
- **Frontend**: React.js with Material-UI (MUI)
  - Modern, responsive UI components
  - Bottom navigation for mobile, sidebar for desktop
  - Form handling with Formik + Yup validation
  - State management with React Context or Redux Toolkit

- **Backend**: Node.js + Express.js
  - REST API endpoints
  - Azure SQL Database connection using `mssql` package
  - Environment configuration with `dotenv`
  - Input validation and sanitization

- **Database**: Azure SQL Database (existing)
  - Direct connection using `mssql` package
  - Stored procedures for complex operations

## 2. Project Structure
```
farm-workers-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Main form pages
│   │   ├── contexts/     # State management
│   │   ├── services/     # API calls
│   │   └── utils/        # Helper functions
│   └── public/           # Static assets
├── server/                # Node.js backend
│   ├── routes/           # API endpoints
│   ├── controllers/      # Business logic
│   ├── models/           # Database models
│   ├── config/          # Configuration
│   └── utils/           # Helper functions
└── shared/               # Shared types/interfaces
```

## 3. Implementation Phases

### Phase 1: Project Setup & Infrastructure
1. Initialize Node.js project with Express
2. Set up React with TypeScript
3. Configure Azure SQL Database connection
4. Implement basic authentication (if required)

### Phase 2: Database Integration
1. Create database models for:
   - Hours tracking (THour_Data_View)
   - Transport management (TTransport)
   - PPE inventory (TPPE_Items)
2. Set up stored procedures for common operations
3. Implement data access layer

### Phase 3: Backend API Development
1. Create RESTful endpoints for:
   - Hours capture
   - Transport capture
   - PPE management
2. Implement input validation
3. Error handling and logging

### Phase 4: Frontend Development
1. Responsive layout implementation
   - Sidebar navigation (desktop)
   - Bottom navigation (mobile)
2. Form components development:
   - Hours capture form
   - Transport capture form
   - PPE capture form
3. Form validation and error handling
4. State management setup

### Phase 5: Integration & Testing
1. Connect frontend to backend APIs
2. End-to-end testing
3. Performance optimization
4. Cross-browser testing

## 4. Key Features

### Hours Capture Form
- Grower selection
- Employee selection
- Date picker
- Hours worked input
- Overtime calculation
- Public holiday tracking
- Sick leave recording

### Transport Capture Form
- Grower selection
- Date picker
- Driver selection
- Rate per day calculation
- Comments section

### PPE Capture Form
- Employee selection
- PPE item selection
- Value tracking
- Date recording

## 5. UI/UX Considerations
- Responsive design using Material-UI's Grid system
- Dark/Light theme support
- Loading states and error handling
- Form validation feedback
- Mobile-first approach
- Consistent styling across all forms

## 6. Security Considerations
- Input sanitization
- SQL injection prevention
- Environment variable management
- API rate limiting
- Error handling without exposing sensitive data

## 7. Performance Optimization
- Code splitting
- Lazy loading of components
- Caching strategies
- Database query optimization
- Asset optimization

## Next Steps
1. Set up development environment
2. Initialize project with basic structure
3. Implement database connection
4. Create first API endpoint
5. Develop basic UI components
