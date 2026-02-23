# AI Math Stumper

A full-stack web application for generating and solving ODE (Ordinary Differential Equation) problems with AI-powered explanations.

## Tech Stack

- **Frontend**: Remix (React) + Vite + TypeScript
- **Backend**: Django 6 + Django REST Framework
- **Database**: PostgreSQL
- **AI**: OpenAI API (optional)

## Quick Start with Docker

The easiest way to run the full application:

```bash
# Start all services (PostgreSQL, Django, Frontend)
docker-compose up --build
```

Then open:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Development Setup

### Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL (or use Docker for database only)

### Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

The backend will run at http://localhost:8000

### Frontend Setup

```bash
# Install dependencies
npm install

# Set environment variable for API URL
export VITE_API_URL=http://localhost:8000

# Start development server
npm run dev
```

The frontend will run at http://localhost:3000

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate/` | GET | Generate a new random ODE task |
| `/api/create_custom/` | POST | Create custom ODE task |
| `/api/verify/` | POST | Verify solution |
| `/api/problems/` | GET | List all problems |
| `/api/task/{id}/` | GET | Get task details |
| `/api/task/{id}/solution/` | GET | Get solution with explanation |
| `/api/task/{id}/explain/` | GET | Get AI explanation |
| `/api/hint/` | POST | Get AI hint |
| `/api/user/` | GET | Get current user info |
| `/api/auth/login/` | POST | User login |
| `/api/auth/logout/` | POST | User logout |
| `/api/auth/register/` | POST | User registration |

## Project Structure

```
ai-math-stumper/
├── app/                    # Remix app routes
│   └── routes/            # Page routes
├── src/
│   ├── components/        # React components
│   ├── services/         # API services
│   └── styles/           # SCSS styles
├── django_math_stumper/  # Django project settings
├── ode_solver/           # Django app (ODE solver)
├── templates/            # Django templates
├── docker-compose.yml    # Docker orchestration
├── Dockerfile.backend    # Backend container
├── Dockerfile.frontend   # Frontend container
├── requirements.txt     # Python dependencies
└── package.json         # Node dependencies
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Debug mode | True |
| `SECRET_KEY` | Django secret key | auto-generated |
| `POSTGRES_DB` | Database name | math_stumper |
| `POSTGRES_USER` | Database user | math_user |
| `POSTGRES_PASSWORD` | Database password | - |
| `POSTGRES_HOST` | Database host | localhost |
| `FRONTEND_URL` | Frontend URL | http://localhost:3000 |
| `OPENAI_API_KEY` | OpenAI API key | - |

## Using the API Service

Import the API service in your components:

```typescript
import { odeApi } from '~/services/api';

// Generate a new task
const task = await odeApi.generateTask();

// Verify a solution
const result = await odeApi.verifySolution(taskId, submittedSolution);

// Get AI explanation
const explanation = await odeApi.getExplanation(taskId);
```

## Features

- **ODE Problem Generation**: Generate random linear ODE systems
- **Custom Problems**: Create problems with custom coefficients and initial conditions
- **Solution Verification**: Verify user-submitted solutions
- **AI Explanations**: Get step-by-step explanations using OpenAI
- **AI Hints**: Get hints when stuck on a problem
- **User Accounts**: Save progress with user authentication

## License

MIT
