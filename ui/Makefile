NODE_ENV ?= development
NPM := npm

.PHONY: all
all: install

.PHONY: install
install:
	$(NPM) install

.PHONY: start
start:
	$(NPM) start

.PHONY: build
build:
	$(NPM) run build

.PHONY: clean
clean:
	rm -rf build
	rm -rf node_modules

.PHONY: test
test:
	$(NPM) test

.PHONY: help
help:
	@echo "Available targets:"
	@echo "  all      - Default target (install)"
	@echo "  install  - Install dependencies"
	@echo "  start    - Start development server"
	@echo "  build    - Build for production"
	@echo "  clean    - Remove build artifacts and dependencies"
	@echo "  test     - Run tests"
	@echo "  help     - Show this help message"
