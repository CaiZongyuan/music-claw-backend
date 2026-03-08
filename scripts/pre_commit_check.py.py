#!/usr/bin/env python3
"""pre-commit hook: 拦截密钥泄露和危险命令"""

import subprocess
import sys
import re

# 密钥泄露检测模式
SECRET_PATTERNS = [
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key"),
    (r"sk-[a-zA-Z0-9]{20,}", "OpenAI / Stripe Secret Key"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Token"),
    (r"-----BEGIN (RSA |EC )?PRIVATE KEY-----", "Private Key"),
    (r'password\s*=\s*["\'][^"\']+(["\']])', "Hardcoded Password"),
]

# 危险命令模式（检查脚本文件）
DANGEROUS_COMMANDS = [
    (r"rm\s+-rf\s+/", "rm -rf / (删除根目录)"),
    (r"git\s+push\s+.*--force", "git push --force"),
    (r"git\s+push\s+-f\b", "git push -f"),
    (r"DROP\s+DATABASE", "DROP DATABASE"),
    (r"TRUNCATE\s+TABLE", "TRUNCATE TABLE"),
]


def get_staged_files():
    """获取暂存区文件列表"""
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        capture_output=True,
        text=True,
    )
    return result.stdout.strip().split("\n") if result.stdout.strip() else []


def get_staged_content(filepath):
    """获取暂存区中的文件内容"""
    result = subprocess.run(
        ["git", "show", f":{filepath}"], capture_output=True, text=True
    )
    return result.stdout


def check_secrets(filepath, content):
    """检查密钥泄露"""
    issues = []
    for pattern, name in SECRET_PATTERNS:
        matches = re.findall(pattern, content)
        if matches:
            issues.append(f"  {filepath}: 检测到 {name}")
    return issues


def check_dangerous_commands(filepath, content):
    """检查危险命令（只检查脚本文件）"""
    script_exts = {".sh", ".bash", ".py", ".rb", ".pl", ".js"}
    if not any(filepath.endswith(ext) for ext in script_exts):
        return []
    issues = []
    for pattern, name in DANGEROUS_COMMANDS:
        if re.search(pattern, content, re.IGNORECASE):
            issues.append(f"  {filepath}: 检测到 {name}")
    return issues


def main():
    files = get_staged_files()
    if not files:
        sys.exit(0)

    all_issues = []

    for filepath in files:
        content = get_staged_content(filepath)
        if not content:
            continue
        all_issues.extend(check_secrets(filepath, content))
        all_issues.extend(check_dangerous_commands(filepath, content))

    if all_issues:
        print("pre-commit hook 拦截：发现以下问题\n")
        for issue in all_issues:
            print(issue)
        print("\n请修复后重新提交。如果确认无误，用 git commit --no-verify 跳过。")
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
