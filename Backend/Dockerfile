FROM node:18  # or python:3.9 for Python
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000  # or your backend port
CMD ["npm", "start"]  # or ["python", "app.py"]