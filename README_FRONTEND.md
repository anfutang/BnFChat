# Chatbot Frontend

This document provides instructions for setting up, running, and deploying the React frontend for the chatbot application.

## Prerequisites

- macOS, Windows, or Linux operating system
- Terminal/Command Line access
- Internet connection

## 1. Installing Node.js & npm

### macOS

**Using Homebrew (Recommended)**:
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (includes npm and npx)
brew install node

# Verify installation
node -v
npm -v
```

**Using Official Installer**:
1. Visit [nodejs.org](https://nodejs.org/)
2. Download the macOS installer (.pkg file)
3. Run the installer and follow the prompts


### Install Project Dependencies

```bash
# Navigate to the project directory if not already there
cd frontend

# Install required dependencies
npm install
```



## 2. Running the Project Locally

### Start the Development Server

```bash
# Navigate to the project directory
cd frontend

# Start the development server
npm start
```

This will:
- Launch the app in development mode
- Open [http://localhost:3000](http://localhost:3000) in your browser
- Auto-reload the page when you make changes
- Show lint errors in the console

### Running the Backend

Ensure your Flask backend is running on port 5000 (or whichever port you configured in the proxy setting):

```bash
# In a separate terminal
cd <backend-directory>
flask run
```

## 4. Building for Production

### Create a Production Build

```bash
# Navigate to the project directory
cd chatbot-frontend

# Create an optimized production build
npm run build
```

This creates a `build` directory with optimized and minified files ready for deployment.

### Deploy to Flask Backend

1. Copy the build files to your Flask application's static directory:

```bash
# Replace paths as needed for your project structure
cp -r build/* ../flask-backend/static/
```

2. Ensure your Flask app is configured to serve the React app (as shown in the backend implementation).

### Alternative Deployment Options

**Deploy to a Static Web Host**:
- Netlify: `netlify deploy` (requires Netlify CLI)
- Vercel: `vercel` (requires Vercel CLI)
- GitHub Pages: `npm install gh-pages --save-dev` and add deployment scripts to package.json

**Deploy to a Node.js Server**:
```bash
# Install serve
npm install -g serve

# Serve the production build
serve -s build
```

**Using Docker**:
```bash
# Build the Docker image
docker build -t chatbot-frontend .

# Run the container
docker run -p 3000:80 chatbot-frontend
```

## 5. Environment Configuration

For different environments, create `.env` files:

**.env.development**:
```
REACT_APP_API_URL=http://localhost:5000/api
```

**.env.production**:
```
REACT_APP_API_URL=/api
```

## Troubleshooting

- **API calls failing**: Ensure proxy is set correctly and Flask server is running
- **"Module not found" errors**: Check that all dependencies are installed
- **CORS issues**: Verify that Flask is configured to allow CORS or that the proxy setting is correct
- **Build errors**: Check console output for specific error messages

## Additional Resources

- [Create React App documentation](https://create-react-app.dev/docs/getting-started)
- [React documentation](https://reactjs.org/docs/getting-started.html)
- [Chatscope UI Kit documentation](https://chatscope.io/storybook/react/)
- [React Joyride documentation](https://docs.react-joyride.com/)