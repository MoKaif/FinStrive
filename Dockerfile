# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /src
COPY frontend/package*.json ./frontend/
WORKDIR /src/frontend
RUN npm install --legacy-peer-deps
COPY frontend/ ./
# We need to create the target directory for the copy-build script
RUN mkdir -p ../api/wwwroot
RUN npm run build:prod
RUN npm run copy-build

# Stage 2: Build Backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY api/api.csproj ./api/
RUN dotnet restore api/api.csproj
COPY api/ ./api/
# Copy the built frontend from the previous stage - this MUST happen before publish
COPY --from=frontend-build /src/api/wwwroot ./api/wwwroot
RUN dotnet publish api/api.csproj -c Release -o /app/publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend-build /app/publish .

# Expose the port the app runs on
EXPOSE 5101

# Set the URL the app should listen on
ENV ASPNETCORE_URLS=http://0.0.0.0:5101
# Default connection string (should be overridden by environment variables in docker-compose.yml or k8s)
ENV ConnectionStrings__DefaultConnection="Host=localhost;Database=FinStrive;Username=postgres;Password=YOUR_PASSWORD"


ENTRYPOINT ["dotnet", "api.dll"]
