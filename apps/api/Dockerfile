FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install dependencies separately for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user for security
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup
USER appuser

# Copy application code (with correct permissions)
COPY --chown=appuser:appgroup . .

RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 8000

# Healthcheck for Railway/Docker
# Note: curl needs to be installed if using slim, or use a python script
# Let's use a lightweight python script for the healthcheck to avoid installing curl
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import http.client; c = http.client.HTTPConnection('localhost', 8000); c.request('GET', '/health'); r = c.getresponse(); exit(0 if r.status == 200 else 1)"

ENTRYPOINT ["./entrypoint.sh"]
