FROM python:3.12-slim

# Prevent Python from writing bytecode and enable unbuffered output for real-time logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create non-root user for container security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8023

# Container healthcheck using FastAPI health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8023/api/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8023"]
