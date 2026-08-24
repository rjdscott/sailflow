.PHONY: help setup dev build docs docs-check lint typecheck test check validate

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Install dependencies from the lockfile
	pnpm install --frozen-lockfile

dev: ## Run the dev server
	pnpm dev

build: ## Build for production
	pnpm build

docs: ## Regenerate docs indexes
	python3 scripts/docs_index.py

docs-check: ## Check docs indexes, provenance files, and run doc tests
	python3 scripts/docs_index.py --check
	python3 scripts/prov_check.py
	node scripts/provenance.mjs --check
	PYTHONPATH=scripts uvx pytest tests -q

lint: ## Lint the codebase
	pnpm lint

typecheck: ## Typecheck the codebase
	pnpm check

test: ## Run tests
	pnpm test

check: docs-check lint typecheck test ## Run all checks (docs, lint, typecheck, test)

validate: ## Polar validation, local only (placeholder for later)
	pnpm validate
