# llm-demo-2 justfile

set dotenv-load
set dotenv-filename := ".env.local"

ralph:
	npx tsx .sandcastle/main.ts

sandbox-build:
	npx sandcastle docker build-image --dockerfile .sandcastle/Dockerfile
