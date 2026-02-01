# Contributing Guide

Thanks for your interest in contributing! 

I welcome contributions from everyone, whether you're a confident developer or just getting started.

The guidelines below relate to main branch. BurnAI (discord bot) will contribute seprate mod branches itself. You're welcome to contribute mods branches yourself, if you don't want to use the bot.

---

## AI & Modern Development

**AI is the new age of programming**, and we embrace it as a powerful tool for collaboration. Whether you're using ChatGPT, Claude, Copilot, or other AI assistants, they can help you write better code faster.

**However, there are important rules:**

> ✅ **Use AI as a tool** - AI can help draft code, find bugs, and suggest improvements

> ✅ **Understand everything you submit** - You must completely understand every line of code in your PR

> ✅ **Follow existing patterns** - Study the codebase first; your code should match the style and architecture

> ✅ **Keep it clean** - AI-generated code must be reviewed, refined, and cleaned up before submission

> ✅ **You are responsible** - You're accountable for your contributions, not the AI

> ❌ **Don't submit code you don't understand** - If you can't explain how it works, don't submit it

> ❌ **Don't ignore existing patterns** - Consistency matters more than "clever" solutions

**The goal:** AI should help you contribute better code, not replace your understanding.

---

## Before You Contribute

### Talk First, Code Later

Before spending significant time on a feature or major change:

1. **[Open an issue](issues)** on GitHub to discuss your idea
2. **[Join Discord](https://discord.gg/DJrkR77HJD)** and chat with the community
3. **Get feedback** from maintainers before diving deep into implementation

This saves everyone time and ensures your contribution aligns with the project's direction.

**Small fixes?** (typos, obvious bugs, minor tweaks) - Just submit a PR directly.

**New features or major changes?** - Discuss first.

---

## Code Standards

Your code should:

- **Follow existing naming conventions** - Study similar files first
- **Match the existing style** - Look at how things are done and follow that pattern
- **Be self-documenting** - Write clear variable/function names that explain intent
- **Handle errors properly** - Think about edge cases, race conditions, etc
- **Stay focused** - Functions should do one thing well
- **Minimize dependencies** - Keep modules loosely coupled

---

## Pull Request Process

1. **Fork the repository** and create a framework branch (`framework/my-feature`)
2. **Make your changes** following the code standards above
3. **Test thoroughly** - Make sure it works and doesn't break existing features
4. **Write a clear PR description**:
   - What does this change?
   - Why is it needed?
   - How did you test it?
5. **Be responsive** to feedback and requests for changes

### PR Guidelines

- Keep PRs focused on a single feature or fix
- Include relevant details in the description
- Reference any related issues
- Be patient - maintainers review PRs as time allows

---

## General Guidelines

- Be respectful and constructive in all interactions
- Help newcomers get started
- Test your changes before submitting
- Update documentation if you change behavior
- No malicious code or intentional vulnerabilities
- Follow the GPL-3.0 license terms

---

## Getting Help

- **Discord:** https://discord.gg/DJrkR77HJD - Ask questions, get help, discuss ideas
- **GitHub Issues:** Use for bug reports and feature requests
- **Code Questions:** Join Discord or open a discussion issue

---

## Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Make your changes
4. Test locally with `npm run start`
5. Build with `npm run build` to create executables

### Mod File Convention

Mod files live in `src/mod/` and follow the naming pattern `mod.js` (default) or `mod.{name}.js` (named). Each mod can have a matching UI file: `ui.html` or `ui.{name}.html`. The shell automatically discovers all mods and presents them in a dropdown.

---

**Thank you for contributing!** Your help makes this project better for the entire Tomb Raider community.
