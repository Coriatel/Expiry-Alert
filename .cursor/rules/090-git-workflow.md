# Git Workflow — Commits, Branching, and PRs

## Commit Message Format

### Conventional Commits
```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (whitespace, formatting)
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (build, dependencies, etc.)
- **perf**: Performance improvements
- **ci**: CI/CD pipeline changes

### Examples
```bash
# Good commit messages
feat(auth): add JWT token refresh endpoint
fix(users): prevent duplicate email registration
refactor(api): extract validation middleware
docs(readme): update setup instructions
test(auth): add integration tests for login flow
chore(deps): upgrade prisma to v5.0.0

# With body
feat(rbac): add role-based content filtering

Implement filterContentByRole middleware to restrict
content visibility based on user role (ADMIN, MALE, FEMALE).
Applies to all content endpoints.

Closes #123

# Breaking change
feat(api)!: change user endpoint response format

BREAKING CHANGE: User API now returns data wrapped in
{ data: {}, meta: {} } instead of flat object.
```

### Rules for Good Commits
```bash
# ✅ DO: Write descriptive, specific messages
git commit -m "fix(auth): prevent token refresh after logout"

# ❌ DON'T: Write vague messages
git commit -m "fix bug"
git commit -m "update code"
git commit -m "WIP"

# ✅ DO: Use present tense imperative
git commit -m "add user registration"

# ❌ DON'T: Use past tense or gerunds
git commit -m "added user registration"
git commit -m "adding user registration"

# ✅ DO: Keep subject line under 72 characters
git commit -m "feat(api): add pagination to users endpoint"

# ❌ DON'T: Write overly long subjects
git commit -m "feat(api): add pagination to users endpoint with support for page, limit, and offset parameters"

# ✅ DO: Reference issues in footer
git commit -m "fix(auth): prevent race condition in token refresh

Closes #123"

# ✅ DO: Make atomic commits (one logical change per commit)
# Each commit should be a working state

# ❌ DON'T: Mix unrelated changes
git commit -m "fix auth bug and update readme and add tests"
```

## Branching Strategy

### Branch Types
```
main (or master)          → Production-ready code
develop                   → Integration branch for features
feature/<name>            → New features
fix/<name>                → Bug fixes
hotfix/<name>             → Urgent production fixes
release/<version>         → Release preparation
```

### Branch Naming
```bash
# ✅ DO: Use descriptive, kebab-case names
git checkout -b feature/user-authentication
git checkout -b fix/login-validation-error
git checkout -b hotfix/security-vulnerability
git checkout -b refactor/extract-auth-middleware

# ❌ DON'T: Use vague or unclear names
git checkout -b new-stuff
git checkout -b fix
git checkout -b johnswork
```

### Workflow

#### Feature Development
```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/add-user-roles

# 2. Work on feature (make commits)
git add .
git commit -m "feat(users): add role field to user model"
git commit -m "feat(auth): implement role-based middleware"
git commit -m "test(auth): add RBAC tests"

# 3. Keep branch updated
git checkout develop
git pull origin develop
git checkout feature/add-user-roles
git rebase develop  # Or merge develop if preferred

# 4. Push to remote
git push origin feature/add-user-roles

# 5. Create Pull Request
# (via GitHub/GitLab UI)

# 6. After PR is merged, delete branch
git checkout develop
git pull origin develop
git branch -d feature/add-user-roles
git push origin --delete feature/add-user-roles
```

#### Hotfix (Production Emergency)
```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-security-issue

# 2. Fix the issue
git add .
git commit -m "fix(auth): patch security vulnerability CVE-2024-1234"

# 3. Push and create PR to main
git push origin hotfix/fix-critical-security-issue

# 4. After merge to main, also merge to develop
git checkout develop
git merge hotfix/fix-critical-security-issue
git push origin develop

# 5. Delete hotfix branch
git branch -d hotfix/fix-critical-security-issue
```

## Pull Request Guidelines

### PR Title
```
# ✅ DO: Follow conventional commit format
feat(auth): add two-factor authentication
fix(api): resolve race condition in user creation
docs: update API documentation for v2 endpoints

# ❌ DON'T: Use vague titles
Update code
Fix bug
PR for new feature
```

### PR Description Template
```markdown
## Summary
<!-- Brief description of what this PR does -->
- Adds JWT token refresh functionality
- Implements token revocation on logout
- Updates authentication middleware

## Changes
<!-- List of specific changes -->
- Added `POST /api/v1/auth/refresh` endpoint
- Added `refreshToken` table to database
- Modified `authenticate` middleware to handle token expiration
- Updated tests for auth flow

## Testing
<!-- How to test these changes -->
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Manually tested login/logout flow
- [ ] Verified token refresh works correctly

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Breaking Changes
<!-- List any breaking changes -->
None

## Related Issues
Closes #123
Related to #124

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No sensitive data exposed
- [ ] Migrations included (if schema changed)
```

### PR Review Checklist

#### For Author
- [ ] Code is self-documenting or has necessary comments
- [ ] Tests are included and pass
- [ ] No console.logs or debug code left
- [ ] No commented-out code (unless intentional with explanation)
- [ ] No secrets or credentials in code
- [ ] Dependencies are justified and minimal
- [ ] Database migrations are included (if applicable)
- [ ] Documentation is updated

#### For Reviewer
- [ ] Code follows project conventions
- [ ] Logic is sound and handles edge cases
- [ ] No security vulnerabilities introduced
- [ ] Performance impact is acceptable
- [ ] Tests adequately cover changes
- [ ] Error handling is appropriate
- [ ] RBAC is properly implemented (if applicable)
- [ ] No sensitive data is exposed in responses

## Common Git Commands

### Daily Workflow
```bash
# Check status
git status

# Stage changes
git add <file>              # Stage specific file
git add .                   # Stage all changes
git add -p                  # Stage chunks interactively

# Commit
git commit -m "feat: add user registration"
git commit --amend          # Amend last commit (use with caution!)

# Push
git push origin <branch>
git push -u origin <branch> # Set upstream for first push

# Pull
git pull origin <branch>
git pull --rebase           # Rebase instead of merge

# View history
git log --oneline
git log --graph --oneline --all

# Show changes
git diff                    # Unstaged changes
git diff --staged           # Staged changes
git diff main..feature      # Compare branches
```

### Branch Management
```bash
# List branches
git branch                  # Local branches
git branch -r               # Remote branches
git branch -a               # All branches

# Create branch
git checkout -b <branch>
git switch -c <branch>      # Modern alternative

# Switch branch
git checkout <branch>
git switch <branch>         # Modern alternative

# Delete branch
git branch -d <branch>      # Safe delete (merged only)
git branch -D <branch>      # Force delete
git push origin --delete <branch> # Delete remote branch

# Rename branch
git branch -m <old> <new>
```

### Undoing Changes
```bash
# Discard unstaged changes
git restore <file>
git checkout -- <file>      # Old way

# Unstage file
git restore --staged <file>
git reset HEAD <file>       # Old way

# Amend last commit
git commit --amend -m "new message"

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) ⚠️ DESTRUCTIVE
git reset --hard HEAD~1

# Revert a commit (create new commit that undoes changes)
git revert <commit-hash>

# Stash changes
git stash                   # Save changes temporarily
git stash list              # List stashes
git stash pop               # Apply and remove latest stash
git stash apply             # Apply latest stash (keep it)
git stash drop              # Delete latest stash
```

### Rebase vs Merge
```bash
# Merge (creates merge commit)
git checkout feature
git merge develop

# Rebase (reapply commits on top of target branch)
git checkout feature
git rebase develop

# Interactive rebase (clean up history)
git rebase -i HEAD~3        # Edit last 3 commits

# ✅ DO: Use rebase for local branches before pushing
# ❌ DON'T: Rebase branches that others are working on
```

## Git Hooks (Optional)

### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linter
npm run lint

# Run tests
npm test

# If any fail, prevent commit
if [ $? -ne 0 ]; then
  echo "❌ Pre-commit checks failed. Commit aborted."
  exit 1
fi

echo "✅ Pre-commit checks passed."
```

### Commit Message Validation
```bash
#!/bin/sh
# .git/hooks/commit-msg

commit_msg=$(cat "$1")

# Check conventional commit format
if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci)(\(.+\))?: .+"; then
  echo "❌ Invalid commit message format."
  echo "Use: <type>(<scope>): <subject>"
  echo "Example: feat(auth): add login endpoint"
  exit 1
fi

echo "✅ Commit message format is valid."
```

## Best Practices

### ✅ DO
- Write clear, descriptive commit messages
- Make small, atomic commits
- Pull before pushing
- Create feature branches for all changes
- Rebase local branches before creating PR
- Delete merged branches
- Use `.gitignore` to exclude build files, dependencies, secrets
- Review your own changes before creating PR
- Squash commits if PR has many WIP commits (optional)

### ❌ DON'T
- Don't commit directly to main/develop
- Don't commit sensitive data (passwords, API keys, .env files)
- Don't commit large binary files (use Git LFS if needed)
- Don't force push to shared branches (`git push --force`)
- Don't rebase public branches
- Don't use `git add .` blindly (review changes first)
- Don't leave WIP commits in production branches
- Don't mix unrelated changes in one commit

## .gitignore Template
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production
build/
dist/
.next/
out/

# Environment variables
.env
.env.local
.env.production
.env.development

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Database
*.sqlite
*.db

# Misc
.cache/
.temp/
tmp/
```

---

**Related Skills**:
- `/skills/ci-cd/` — CI/CD pipeline setup
- `/skills/terminal-ssh-vps/` — Terminal operations

**See Also**:
- [100-security-secrets.md](./100-security-secrets.md)
- [000-overview.md](./000-overview.md)
