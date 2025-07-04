# augmentED

This is a web application that helps students with their studies. It includes features like a GPA calculator, a study tracker, and an AI-assisted grader.

## Setup and Startup

### Prerequisites

*   Python 3.x
*   Node.js and npm
*   PostgreSQL

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment:**
    *   **On Windows:**
        ```bash
        venv\Scripts\activate
        ```
    *   **On macOS and Linux:**
        ```bash
        source venv/bin/activate
        ```

4.  **Install the required packages:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Create a `.env` file:**
    *   Create a file named `.env` in the `backend` directory.
    *   Add the following environment variables to the `.env` file:
        ```
        XAI_API_KEY=your_xai_api_key
        ```

6.  **Set up the database:**
    *   Make sure you have PostgreSQL installed and running.
    *   Create a new database named `augmented_db`.
    *   Create a new user named `augmented_user` with the password `password123`.
    *   Grant the `augmented_user` all privileges on the `augmented_db` database.

7.  **Run the database migrations:**
    ```bash
    flask db upgrade
    ```

8.  **Start the backend server:**
    ```bash
    gunicorn --bind 0.0.0.0:5000 app:app
    ```

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install the required packages:**
    ```bash
    npm install
    ```

3.  **Start the frontend server:**
    ```bash
    npm start
    ```

## Usage

Once both the backend and frontend servers are running, you can access the application by opening your web browser and navigating to `http://localhost:3000`.
