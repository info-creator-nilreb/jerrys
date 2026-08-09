import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const featuresRoot = path.join(root, "features");
const sourceRoots = ["app", "components", "features", "lib"];
const modules = new Set([
  "catalog",
  "inventory",
  "customers",
  "orders",
  "payments",
  "workshops",
  "fulfillment",
  "integrations",
]);
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"]);
const ignoredDirectories = new Set([".next", "generated", "node_modules"]);

function collectSourceFiles(directory, files = []) {
  if (!fs.existsSync(directory)) {
    return files;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(absolutePath, files);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function moduleForFile(filePath) {
  const relative = path.relative(featuresRoot, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return relative.split(path.sep)[0] || null;
}

function featureTarget(importer, specifier) {
  if (specifier.startsWith("@/features/")) {
    const [moduleName, ...rest] = specifier.slice("@/features/".length).split("/");
    return { moduleName, subpath: rest.join("/") };
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const resolved = path.resolve(path.dirname(importer), specifier);
  const relative = path.relative(featuresRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  const [moduleName, ...rest] = relative.split(path.sep);
  return { moduleName, subpath: rest.join("/") };
}

function isPublicApi(subpath) {
  if (subpath === "" || /^(index)(\.[cm]?[jt]sx?)?$/.test(subpath)) {
    return true;
  }
  // Reine Domain-Hilfen für Storefront-Client (ohne Application/DB-Barrel).
  if (/^(password|address|checkout-prefill)(\.[cm]?[jt]sx?)?$/.test(subpath)) {
    return true;
  }
  return false;
}

function importedSpecifiers(sourceFile) {
  const specifiers = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push({
        value: node.moduleSpecifier.text,
        position: node.moduleSpecifier.getStart(sourceFile),
      });
    }

    if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const argument = node.arguments[0];
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === "require";

      if ((isDynamicImport || isRequire) && ts.isStringLiteral(argument)) {
        specifiers.push({
          value: argument.text,
          position: argument.getStart(sourceFile),
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

const violations = [];
const files = sourceRoots.flatMap((sourceRoot) =>
  collectSourceFiles(path.join(root, sourceRoot)),
);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const sourceModule = moduleForFile(filePath);

  if (sourceModule && !modules.has(sourceModule)) {
    violations.push({
      filePath,
      line: 1,
      message: `unknown feature module "${sourceModule}"`,
    });
  }

  for (const specifier of importedSpecifiers(sourceFile)) {
    const target = featureTarget(filePath, specifier.value);
    if (!target) {
      continue;
    }

    const position = sourceFile.getLineAndCharacterOfPosition(specifier.position);
    const details = {
      filePath,
      line: position.line + 1,
    };

    if (!modules.has(target.moduleName)) {
      violations.push({
        ...details,
        message: `import targets unknown feature module "${target.moduleName}"`,
      });
      continue;
    }

    if (sourceModule === target.moduleName || isPublicApi(target.subpath)) {
      continue;
    }

    violations.push({
      ...details,
      message:
        `import of internal API "${specifier.value}" is forbidden; ` +
        `use "@/features/${target.moduleName}"`,
    });
  }
}

if (violations.length > 0) {
  console.error("Feature module boundary violations:");
  for (const violation of violations) {
    console.error(
      `- ${path.relative(root, violation.filePath)}:${violation.line} ${violation.message}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(`Architecture boundaries valid (${files.length} source files checked).`);
}
