# syntax=docker/dockerfile:1
# Build context = repository root (see compose.yaml / Railway settings).

# 1. Build the React frontend -------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /web
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm build

# 2. Publish the .NET API ---------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY global.json ./
COPY backend/ ./backend/
RUN dotnet restore backend/Backend.slnx
RUN dotnet publish backend/src/MyFinances.Api/MyFinances.Api.csproj \
    -c Release -o /app/publish --no-restore \
    -p:OpenApiGenerateDocuments=false

# 3. Runtime image --------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=api /app/publish ./
COPY --from=web /web/dist ./wwwroot
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyFinances.Api.dll"]
