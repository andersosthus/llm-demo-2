FROM node:22-trixie

# Install system dependencies
RUN apt-get update && apt-get install -y \
	git \
	ca-certificates \
	curl \
	gnupg \
	jq \
	build-essential \
	just \
	&& rm -rf /var/lib/apt/lists/*

# Install Node.js LTS
RUN mkdir -p /etc/apt/keyrings \
	&& curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
	| gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
	&& echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
	> /etc/apt/sources.list.d/nodesource.list \
	&& apt-get update && apt-get install -y nodejs \
	&& rm -rf /var/lib/apt/lists/*

# Enable pnpm via Corepack while still running as root
RUN corepack enable \
	&& corepack prepare pnpm@latest --activate

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
	| dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
	| tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
	&& apt-get update && apt-get install -y gh \
	&& rm -rf /var/lib/apt/lists/*

# Create a non-root user for Claude to run as
RUN useradd -m -s /bin/bash agent
USER agent

# Install Claude Code CLI
ENV PATH="/go:/usr/local/go/bin:$PATH"
RUN curl -fsSL https://claude.ai/install.sh | bash

# Install OpenAI Cortex
ENV CODEX_UNSAFE_ALLOW_NO_SANDBOX=1
ENV PATH="/home/agent/.local/bin:$PATH"
RUN mkdir -p /home/agent/.local/bin \
	&& set -eux; \
	arch="$(dpkg --print-architecture)"; \
	case "$arch" in \
	amd64) codex_asset="codex-x86_64-unknown-linux-musl.tar.gz" ;; \
	arm64) codex_asset="codex-aarch64-unknown-linux-musl.tar.gz" ;; \
	*) echo "Unsupported architecture: $arch" >&2; exit 1 ;; \
	esac; \
	codex_bin="${codex_asset%.tar.gz}"; \
	codex_url="https://github.com/openai/codex/releases/latest/download/$codex_asset"; \
	curl -fsSL "$codex_url" -o /tmp/codex.tar.gz; \
	tar -xzf /tmp/codex.tar.gz -C /tmp; \
	install -m 0755 "/tmp/$codex_bin" /home/agent/.local/bin/codex; \
	rm -f "/tmp/$codex_bin" /tmp/codex.tar.gz

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/home/agent/.cargo/bin:$PATH"

RUN cargo install cargo-binstall
RUN cargo binstall prek

# Add Claude to PATH
ENV PATH="/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
