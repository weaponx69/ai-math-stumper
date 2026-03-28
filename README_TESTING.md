# Testing Setup

This project includes a comprehensive testing suite using Jest and React Testing Library.

## Test Framework

- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **Jest DOM**: Custom Jest matchers for DOM elements

## Test Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Component Tests
- `src/routes/_index/route.test.tsx` - Tests for the main ODE solver component
- Tests user interactions, API calls, loading states, and error handling

### Service Tests
- `src/services/api.test.ts` - Tests for API service functions
- Tests HTTP requests, error handling, and response parsing

### Test Setup
- `src/test/setup.ts` - Jest configuration and global mocks
- `jest.config.js` - Jest configuration file

## Test Coverage

The test suite covers:
- ✅ Component rendering and user interactions
- ✅ Form input validation and state management
- ✅ API integration and error handling
- ✅ Loading states and UI feedback
- ✅ Button functionality and disabled states
- ✅ Solution display and formatting
- ✅ Error message display

## Mocking

The tests use mocks for:
- API calls (`fetch`)
- Browser APIs (`matchMedia`, `IntersectionObserver`, `ResizeObserver`)
- Window methods (`scrollTo`)

## Running Tests

1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. View coverage: `npm run test:coverage`

## Test Files

- `src/routes/_index/route.test.tsx` - Main component tests
- `src/services/api.test.ts` - API service tests
- `src/test/setup.ts` - Test configuration
- `jest.config.js` - Jest configuration