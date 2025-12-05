# mcpkit Implementation Steps

## Phase 1: Project Setup

### 1.1 Initialize Project Structure
- [x] Initialize Node.js project with `npm init`
- [x] Set up project repository structure
- [x] Configure TypeScript (optional but recommended)
- [x] Create basic CLI entry point (`src/index.js` or `src/index.ts`)
- [x] Add `bin` field to package.json for CLI executable

### 1.2 Set Up Dependencies
- [x] Add `@inquirer/prompts` for interactive prompts
- [x] Add `commander` for argument parsing and command structure
- [x] Add `chalk` for colored terminal output (optional)
- [x] Set up Jest for testing framework
- [x] Add `fs/promises` (built-in) for file operations

### 1.3 Create Core Utilities
- [x] Implement registry path resolution (`~/.mcpkit/mcp-servers.json`)
- [x] Implement project config path resolution (`.mcp.json`)
- [x] Create JSON read/write utilities with error handling
- [x] Create registry file initialization (auto-create if missing)

## Phase 2: Registry Management Commands

### 2.1 `mcpkit registry add`
- [x] Implement interactive prompt for JSON paste input
- [x] Parse JSON with flexible format handling (with/without outer braces)
- [x] Extract server name (key) and config (value)
- [x] Validate JSON syntax with clear error messages
- [x] Check for duplicate server names
- [x] Prompt user to overwrite or cancel on duplicates
- [x] Write to `~/.mcpkit/mcp-servers.json`
- [x] Display success message with server name

### 2.2 `mcpkit registry remove`
- [x] Accept server name as argument
- [x] Read from `~/.mcpkit/mcp-servers.json`
- [x] Validate registry file exists
- [x] Check if server name exists in registry
- [x] Remove server from registry
- [x] Write updated registry back to file
- [x] Display success message

### 2.3 `mcpkit list`
- [x] Read from `~/.mcpkit/mcp-servers.json`
- [x] Display all server names in a clean list
- [x] Show total count of servers
- [x] Handle empty registry gracefully
- [x] (Optional) Add `--verbose` flag to show full configs
- [ ] (Optional) Add name pattern filtering

## Phase 3: Project Configuration Commands

### 3.1 `mcpkit init`
- [x] Read available servers from `~/.mcpkit/mcp-servers.json`
- [x] Display multi-select checkbox interface
- [x] Allow users to select multiple servers
- [x] Check if `.mcp.json` exists in current directory
- [x] If exists: prompt to merge or overwrite
- [x] Generate `.mcp.json` with selected servers
- [x] Use proper format with `mcpServers` key
- [x] Display success message with file location

### 3.2 `mcpkit add`
- [x] Implement interactive prompt for JSON paste input
- [x] Parse JSON with flexible format handling
- [x] Extract server name (key) and config (value)
- [x] Validate JSON syntax
- [x] Check if `.mcp.json` exists (create if missing)
- [x] Read existing `.mcp.json`
- [x] Check for duplicate server names
- [x] Prompt user to overwrite or cancel on duplicates
- [x] Add server to `mcpServers` object
- [x] Write updated `.mcp.json`
- [x] Display success message

### 3.3 `mcpkit remove`
- [x] Accept server name as argument
- [x] Validate `.mcp.json` exists in current directory
- [x] Read `.mcp.json`
- [x] Check if server name exists in config
- [x] Remove server from `mcpServers` object
- [x] Write updated `.mcp.json`
- [x] Display success message

## Phase 4: Error Handling & Validation

### 4.1 Input Validation
- [x] Validate JSON syntax with helpful error messages (line/column info)
- [x] Handle malformed JSON gracefully
- [x] Validate server name format
- [x] Ensure required config fields are present

### 4.2 File Operations
- [x] Handle missing registry file (auto-create)
- [x] Handle missing `.mcp.json` for remove command (clear error)
- [x] Handle file permission errors
- [x] Handle invalid JSON in existing files

### 4.3 User Experience
- [x] Clear error messages for all failure cases
- [x] Confirmation prompts before destructive operations
- [x] Success feedback for all operations
- [x] Handle Ctrl+C gracefully in interactive prompts

## Phase 5: Testing

### 5.1 Unit Tests
- [x] Test JSON parsing utilities
- [x] Test registry read/write operations
- [x] Test project config read/write operations
- [x] Test duplicate detection logic
- [x] Test error handling

### 5.2 Integration Tests
- [x] Test `mcpkit init` full workflow
- [x] Test `mcpkit add` (project)
- [x] Test `mcpkit remove` (project)
- [x] Test `mcpkit registry add`
- [x] Test `mcpkit registry remove`
- [x] Test `mcpkit list`
- [x] Test `mcpkit registry list`
- [x] Test merge vs overwrite scenarios

### 5.3 Edge Cases
- [x] Empty registry
- [x] Malformed JSON in registry
- [x] Missing permissions
- [x] Invalid server names
- [ ] Concurrent file access (not critical for single-user CLI)

## Phase 6: Documentation & Polish

### 6.1 User Documentation
- [x] Create README with installation instructions
- [x] Document all commands with examples
- [x] Create quick start guide
- [x] Add troubleshooting section

### 6.2 Developer Documentation
- [ ] Document project architecture
- [ ] Add code comments
- [ ] Create contributing guide
- [ ] Document build and test process

### 6.3 Polish
- [x] Add help text for all commands
- [x] Add version flag
- [x] Improve error messages
- [x] Add color/formatting to CLI output (if desired)

## Phase 7: Distribution

### 7.1 Packaging
- [ ] Set up build system
- [ ] Create release binaries (if compiled language)
- [ ] Set up package registry (npm/cargo/PyPI)
- [ ] Test installation process

### 7.2 CI/CD
- [ ] Set up automated testing
- [ ] Set up automated builds
- [ ] Set up automated releases
- [ ] Set up version tagging

## Technology Stack (Decided)

**Runtime**: Node.js (18+)
**CLI Framework**: `@inquirer/prompts` (modern, modular approach)
**Argument Parsing**: `commander` (clean API, popular, well-maintained)
**Testing**: Jest
**File Operations**: Built-in `fs/promises`
**Optional Enhancements**: `chalk` for colors

### Why This Stack?
- Target users already have Node.js (MCP servers use npm)
- Fast development and iteration
- Excellent ecosystem for CLI tools
- Easy distribution via npm
- Native JSON support

## Open Questions to Resolve

1. **TypeScript**: Use TypeScript or plain JavaScript?

2. **Default Registry**: Should initial registry include default MCP servers?

3. **Config Validation**: How strict should JSON validation be?

4. **Merge Behavior**: For `init` when `.mcp.json` exists, what's the best UX?

## Priority Order

**MVP (Minimum Viable Product):**
1. Phase 1: Project Setup
2. Phase 2.1: `mcpkit registry add`
3. Phase 2.3: `mcpkit list`
4. Phase 3.1: `mcpkit init`
5. Phase 4: Basic error handling

**Post-MVP:**
6. Phase 2.2: `mcpkit registry remove`
7. Phase 3.2: `mcpkit add` (project)
8. Phase 3.3: `mcpkit remove` (project)
9. Phase 5: Testing
10. Phase 6: Documentation
11. Phase 7: Distribution
