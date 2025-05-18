## Running the Project with Docker

This project is fully containerized and can be run using Docker Compose. Below are the project-specific instructions and requirements for running the client and server services in Docker.

### Requirements
- **Docker** and **Docker Compose** installed on your system.
- The project uses **Node.js version 22.13.1** for both client and server (as specified in the Dockerfiles).

### Services and Ports
- **Client (`ts-client`)**
  - Runs the Vite preview server
  - Exposes port **5173** (mapped to host)
- **Server (`ts-server`)**
  - Runs the Express backend
  - Exposes port **5000** (mapped to host)

### Environment Variables
- No required environment variables are specified in the Dockerfiles or compose file by default.
- If you need to use environment variables, you can add a `.env` file in the `./client` or `./server` directories and uncomment the `env_file` lines in `docker-compose.yml`.

### Build and Run Instructions
1. **Clone the repository and navigate to the project root.**
2. **Build and start the services:**
   ```sh
   docker compose up --build
   ```
   This will build both the client and server images and start the containers.

3. **Access the application:**
   - Frontend: [http://localhost:4173](http://localhost:4173)
   - Backend API: [http://localhost:5000](http://localhost:5000)

### Special Configuration
- The server container includes an `uploads` directory for log files. If you need to persist or access these files, consider mounting a volume in `docker-compose.yml`.
- Both containers run as non-root users for improved security.
- The `NODE_OPTIONS=--max-old-space-size=4096` environment variable is set in both containers to increase the available memory for Node.js processes.

---

_If you update the Dockerfiles or compose file, please ensure this section stays up to date._
