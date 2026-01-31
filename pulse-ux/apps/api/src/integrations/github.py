"""
GitHub API integration for PR creation.

This module provides functionality to create branches, commit files,
and open Pull Requests using GitHub's REST API.
"""

import base64
from typing import Any

import httpx

from src.config import settings


class GitHubClient:
    """
    Async client for GitHub API.

    Provides methods for creating branches, committing files, and opening PRs.
    Uses Personal Access Token (PAT) for authentication.
    """

    BASE_URL = "https://api.github.com"

    def __init__(self, token: str | None = None):
        """
        Initialize the GitHub client.

        Args:
            token: GitHub Personal Access Token.
        """
        self.token = token
        self._client: httpx.AsyncClient | None = None

    def _get_headers(self) -> dict[str, str]:
        """Get headers for GitHub API requests."""
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers=self._get_headers(),
                timeout=30.0,
            )
        return self._client

    def _parse_repo(self, repo_url: str) -> tuple[str, str]:
        """
        Parse owner and repo name from a GitHub URL.

        Args:
            repo_url: GitHub repository URL

        Returns:
            Tuple of (owner, repo)
        """
        # Handle various URL formats
        url = repo_url.rstrip("/")
        if url.endswith(".git"):
            url = url[:-4]

        parts = url.split("/")
        return parts[-2], parts[-1]

    async def get_default_branch(self, repo_url: str) -> str:
        """
        Get the default branch name for a repository.

        Args:
            repo_url: GitHub repository URL

        Returns:
            Default branch name (e.g., "main" or "master")
        """
        client = await self._get_client()
        owner, repo = self._parse_repo(repo_url)

        response = await client.get(f"/repos/{owner}/{repo}")
        response.raise_for_status()

        data = response.json()
        return data["default_branch"]

    async def get_branch_sha(self, repo_url: str, branch: str) -> str:
        """
        Get the SHA of a branch's latest commit.

        Args:
            repo_url: GitHub repository URL
            branch: Branch name

        Returns:
            SHA of the latest commit
        """
        client = await self._get_client()
        owner, repo = self._parse_repo(repo_url)

        response = await client.get(f"/repos/{owner}/{repo}/git/refs/heads/{branch}")
        response.raise_for_status()

        data = response.json()
        return data["object"]["sha"]

    async def create_branch(
        self,
        repo_url: str,
        branch_name: str,
        from_branch: str | None = None,
    ) -> str:
        """
        Create a new branch in the repository.

        Args:
            repo_url: GitHub repository URL
            branch_name: Name for the new branch
            from_branch: Branch to create from (default: default branch)

        Returns:
            SHA of the new branch
        """
        client = await self._get_client()
        owner, repo = self._parse_repo(repo_url)

        # Get the SHA to branch from
        if from_branch is None:
            from_branch = await self.get_default_branch(repo_url)
        sha = await self.get_branch_sha(repo_url, from_branch)

        # Create the new branch
        response = await client.post(
            f"/repos/{owner}/{repo}/git/refs",
            json={
                "ref": f"refs/heads/{branch_name}",
                "sha": sha,
            },
        )
        response.raise_for_status()

        return sha

    async def get_file_content(
        self,
        repo_url: str,
        file_path: str,
        branch: str | None = None,
    ) -> tuple[str, str] | None:
        """
        Get the content of a file from the repository.

        Args:
            repo_url: GitHub repository URL
            file_path: Path to the file in the repository
            branch: Branch name (default: default branch)

        Returns:
            Tuple of (content, sha) or None if file doesn't exist
        """
        client = await self._get_client()
        owner, repo = self._parse_repo(repo_url)

        if branch is None:
            branch = await self.get_default_branch(repo_url)

        try:
            response = await client.get(
                f"/repos/{owner}/{repo}/contents/{file_path}",
                params={"ref": branch},
            )
            response.raise_for_status()

            data = response.json()
            content = base64.b64decode(data["content"]).decode("utf-8")
            return content, data["sha"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    async def create_or_update_file(
        self,
        repo_url: str,
        file_path: str,
        content: str,
        message: str,
        branch: str,
        file_sha: str | None = None,
    ) -> dict[str, Any]:
        """
        Create or update a file in the repository.

        Args:
            repo_url: GitHub repository URL
            file_path: Path to the file in the repository
            content: New file content
            message: Commit message
            branch: Branch to commit to
            file_sha: SHA of existing file (for updates)

        Returns:
            API response with commit details
        """
        client = await self._get_client()
        owner, repo = self._parse_repo(repo_url)

        payload = {
            "message": message,
            "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
            "branch": branch,
        }

        if file_sha:
            payload["sha"] = file_sha

        response = await client.put(
            f"/repos/{owner}/{repo}/contents/{file_path}",
            json=payload,
        )
        response.raise_for_status()

        return response.json()

    async def create_pull_request(
        self,
        repo_url: str,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str | None = None,
    ) -> dict[str, Any]:
        """
        Create a Pull Request.

        Args:
            repo_url: GitHub repository URL
            title: PR title
            body: PR description
            head_branch: Branch with changes
            base_branch: Target branch (default: default branch)

        Returns:
            API response with PR details including number and URL
        """
        client = await self._get_client()
        owner, repo = self._parse_repo(repo_url)

        if base_branch is None:
            base_branch = await self.get_default_branch(repo_url)

        response = await client.post(
            f"/repos/{owner}/{repo}/pulls",
            json={
                "title": title,
                "body": body,
                "head": head_branch,
                "base": base_branch,
            },
        )
        response.raise_for_status()

        return response.json()

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


def create_github_client(token: str) -> GitHubClient:
    """
    Factory function to create a GitHub client with a specific token.

    Args:
        token: GitHub Personal Access Token

    Returns:
        Configured GitHubClient instance
    """
    return GitHubClient(token=token)
