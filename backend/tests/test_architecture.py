import ast
from pathlib import Path


def _get_imports_from_file(file_path: Path) -> list[str]:
    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=str(file_path))

    imports: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.append(node.module)
    return imports


def test_llm_module_has_no_gateway_or_reach_imports() -> None:
    llm_dir = Path(__file__).resolve().parent.parent / "app" / "llm"
    forbidden_prefixes = ["app.reach", "app.api", "app.guard", "app.worker"]

    for py_file in llm_dir.glob("*.py"):
        file_imports = _get_imports_from_file(py_file)
        for imp in file_imports:
            for forbidden in forbidden_prefixes:
                msg = f"AST violation in {py_file.name}: imports {imp}"
                assert not imp.startswith(forbidden), msg


def test_guard_module_is_pure_and_has_no_llm_imports() -> None:
    guard_dir = Path(__file__).resolve().parent.parent / "app" / "guard"
    forbidden_prefixes = ["app.llm", "app.reach"]

    for py_file in guard_dir.glob("*.py"):
        file_imports = _get_imports_from_file(py_file)
        for imp in file_imports:
            for forbidden in forbidden_prefixes:
                msg = f"AST violation in {py_file.name}: imports {imp}"
                assert not imp.startswith(forbidden), msg


def test_spine_module_never_imports_reach_or_llm() -> None:
    spine_dir = Path(__file__).resolve().parent.parent / "app" / "spine"
    forbidden_prefixes = ["app.reach", "app.llm"]

    for py_file in spine_dir.glob("*.py"):
        file_imports = _get_imports_from_file(py_file)
        for imp in file_imports:
            for forbidden in forbidden_prefixes:
                msg = f"AST violation in {py_file.name}: imports {imp}"
                assert not imp.startswith(forbidden), msg
