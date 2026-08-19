export type JavaImportCatalog = Map<string, string>

export type JavaTextEdit = {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
  text: string
}

const JAVA_LANG = new Set([
  'Appendable', 'AutoCloseable', 'Boolean', 'Byte', 'Character', 'CharSequence', 'Class',
  'ClassLoader', 'Cloneable', 'Comparable', 'Deprecated', 'Double', 'Enum', 'Error',
  'Exception', 'Float', 'FunctionalInterface', 'Integer', 'Iterable', 'Long', 'Math',
  'Number', 'Object', 'Override', 'Package', 'Process', 'Record', 'Runnable', 'Runtime',
  'RuntimeException', 'SafeVarargs', 'Short', 'String', 'StringBuffer', 'StringBuilder',
  'SuppressWarnings', 'System', 'Thread', 'Throwable', 'Void',
])

/** 간단 이름이 겹치지 않는 JDK·Jakarta·Spring 타입. 작업공간 선언이 같은 이름을 덮어쓴다. */
const COMMON_JAVA_IMPORTS: Readonly<Record<string, string>> = {
  ArrayDeque: 'java.util.ArrayDeque',
  ArrayList: 'java.util.ArrayList',
  Arrays: 'java.util.Arrays',
  Base64: 'java.util.Base64',
  Collection: 'java.util.Collection',
  Collections: 'java.util.Collections',
  Comparator: 'java.util.Comparator',
  Deque: 'java.util.Deque',
  EnumMap: 'java.util.EnumMap',
  EnumSet: 'java.util.EnumSet',
  HashMap: 'java.util.HashMap',
  HashSet: 'java.util.HashSet',
  Iterator: 'java.util.Iterator',
  LinkedHashMap: 'java.util.LinkedHashMap',
  LinkedHashSet: 'java.util.LinkedHashSet',
  LinkedList: 'java.util.LinkedList',
  List: 'java.util.List',
  Map: 'java.util.Map',
  Objects: 'java.util.Objects',
  Optional: 'java.util.Optional',
  Queue: 'java.util.Queue',
  Random: 'java.util.Random',
  Scanner: 'java.util.Scanner',
  Set: 'java.util.Set',
  TreeMap: 'java.util.TreeMap',
  TreeSet: 'java.util.TreeSet',
  UUID: 'java.util.UUID',
  ConcurrentHashMap: 'java.util.concurrent.ConcurrentHashMap',
  CompletableFuture: 'java.util.concurrent.CompletableFuture',
  TimeUnit: 'java.util.concurrent.TimeUnit',
  Collectors: 'java.util.stream.Collectors',
  Stream: 'java.util.stream.Stream',
  Function: 'java.util.function.Function',
  Predicate: 'java.util.function.Predicate',
  Consumer: 'java.util.function.Consumer',
  Supplier: 'java.util.function.Supplier',
  BiFunction: 'java.util.function.BiFunction',
  BiConsumer: 'java.util.function.BiConsumer',
  LocalDate: 'java.time.LocalDate',
  LocalDateTime: 'java.time.LocalDateTime',
  LocalTime: 'java.time.LocalTime',
  Instant: 'java.time.Instant',
  Duration: 'java.time.Duration',
  Period: 'java.time.Period',
  ZonedDateTime: 'java.time.ZonedDateTime',
  ZoneId: 'java.time.ZoneId',
  DateTimeFormatter: 'java.time.format.DateTimeFormatter',
  BigDecimal: 'java.math.BigDecimal',
  BigInteger: 'java.math.BigInteger',
  IOException: 'java.io.IOException',
  UncheckedIOException: 'java.io.UncheckedIOException',
  Serializable: 'java.io.Serializable',
  Path: 'java.nio.file.Path',
  Paths: 'java.nio.file.Paths',
  Files: 'java.nio.file.Files',
  Pattern: 'java.util.regex.Pattern',
  Matcher: 'java.util.regex.Matcher',
  Entity: 'jakarta.persistence.Entity',
  Table: 'jakarta.persistence.Table',
  Id: 'jakarta.persistence.Id',
  GeneratedValue: 'jakarta.persistence.GeneratedValue',
  GenerationType: 'jakarta.persistence.GenerationType',
  Column: 'jakarta.persistence.Column',
  JoinColumn: 'jakarta.persistence.JoinColumn',
  ManyToOne: 'jakarta.persistence.ManyToOne',
  OneToMany: 'jakarta.persistence.OneToMany',
  ManyToMany: 'jakarta.persistence.ManyToMany',
  OneToOne: 'jakarta.persistence.OneToOne',
  FetchType: 'jakarta.persistence.FetchType',
  CascadeType: 'jakarta.persistence.CascadeType',
  Transient: 'jakarta.persistence.Transient',
  Service: 'org.springframework.stereotype.Service',
  Repository: 'org.springframework.stereotype.Repository',
  Component: 'org.springframework.stereotype.Component',
  Controller: 'org.springframework.stereotype.Controller',
  RestController: 'org.springframework.web.bind.annotation.RestController',
  RequestMapping: 'org.springframework.web.bind.annotation.RequestMapping',
  GetMapping: 'org.springframework.web.bind.annotation.GetMapping',
  PostMapping: 'org.springframework.web.bind.annotation.PostMapping',
  PutMapping: 'org.springframework.web.bind.annotation.PutMapping',
  DeleteMapping: 'org.springframework.web.bind.annotation.DeleteMapping',
  RequestBody: 'org.springframework.web.bind.annotation.RequestBody',
  PathVariable: 'org.springframework.web.bind.annotation.PathVariable',
  RequestParam: 'org.springframework.web.bind.annotation.RequestParam',
  ResponseEntity: 'org.springframework.http.ResponseEntity',
  HttpStatus: 'org.springframework.http.HttpStatus',
  Transactional: 'org.springframework.transaction.annotation.Transactional',
  Autowired: 'org.springframework.beans.factory.annotation.Autowired',
  JpaRepository: 'org.springframework.data.jpa.repository.JpaRepository',
}

const TYPE_DECL =
  /(?:^|\n)\s*(?:(?:public|protected|private|abstract|final|sealed|non-sealed|static)\s+)*(?:class|interface|enum|record|@interface)\s+([A-Za-z_$][\w$]*)/g

export function parseJavaPackage(source: string): string | null {
  const match = source.match(/^\s*package\s+([\w.]+)\s*;/m)
  return match ? match[1] : null
}

export function parseJavaDeclaredTypes(source: string): { simpleName: string; qualifiedName: string }[] {
  const pkg = parseJavaPackage(source)
  const types: { simpleName: string; qualifiedName: string }[] = []
  TYPE_DECL.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TYPE_DECL.exec(source))) {
    const simpleName = match[1]
    types.push({
      simpleName,
      qualifiedName: pkg ? `${pkg}.${simpleName}` : simpleName,
    })
  }
  return types
}

export function catalogForFiles(files: { content: string }[]): JavaImportCatalog {
  const catalog: JavaImportCatalog = new Map(Object.entries(COMMON_JAVA_IMPORTS))
  for (const file of files) {
    for (const type of parseJavaDeclaredTypes(file.content)) {
      catalog.set(type.simpleName, type.qualifiedName)
    }
  }
  return catalog
}

function stripCommentsAndStrings(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '')
    .replace(/"(?:\\.|[^"\\])*"/g, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, ' ')
}

function parentPackage(qualifiedName: string): string {
  const at = qualifiedName.lastIndexOf('.')
  return at === -1 ? '' : qualifiedName.slice(0, at)
}

function coversImport(source: string, qualifiedName: string): boolean {
  const pkg = parseJavaPackage(source)
  if (pkg && parentPackage(qualifiedName) === pkg) return true

  const importLine = /^\s*import\s+(static\s+)?([\w.]+)(\.\*)?\s*;/gm
  let match: RegExpExecArray | null
  while ((match = importLine.exec(source))) {
    if (match[1]) continue
    const imported = match[2]
    if (match[3]) {
      if (parentPackage(qualifiedName) === imported) return true
      continue
    }
    if (imported === qualifiedName) return true
  }
  return false
}

function usedSimpleNames(source: string): Set<string> {
  const stripped = stripCommentsAndStrings(source)
  const names = new Set<string>()
  for (const line of stripped.split('\n')) {
    if (/^\s*(package|import)\s+/.test(line)) continue
    const withoutDecl = line.replace(
      /\b(?:class|interface|enum|record|@interface)\s+[A-Za-z_$][\w$]*/g,
      ' ',
    )
    const token = /(?<![.\w])[A-Z][A-Za-z0-9_]*/g
    let match: RegExpExecArray | null
    while ((match = token.exec(withoutDecl))) {
      if (match[0].length === 1) continue
      names.add(match[0])
    }
  }
  return names
}

export function isJavaImportNeeded(source: string, qualifiedName: string): boolean {
  const simple = qualifiedName.slice(qualifiedName.lastIndexOf('.') + 1)
  if (JAVA_LANG.has(simple)) return false
  if (parseJavaDeclaredTypes(source).some((type) => type.simpleName === simple)) return false
  return !coversImport(source, qualifiedName)
}

export function missingImportQualifiedNames(source: string, catalog: JavaImportCatalog): string[] {
  const declared = new Set(parseJavaDeclaredTypes(source).map((type) => type.simpleName))
  const missing = new Set<string>()
  for (const simple of usedSimpleNames(source)) {
    if (JAVA_LANG.has(simple) || declared.has(simple)) continue
    const qualified = catalog.get(simple)
    if (!qualified) continue
    if (!coversImport(source, qualified)) missing.add(qualified)
  }
  return [...missing].sort()
}

export function insertJavaImports(source: string, qualifiedNames: string[]): string {
  const unique = [...new Set(qualifiedNames)].filter((name) => isJavaImportNeeded(source, name)).sort()
  if (unique.length === 0) return source
  const block = unique.map((name) => `import ${name};`).join('\n')
  const lines = source.split('\n')
  let lastImport = -1
  let packageLine = -1
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*package\s+/.test(lines[index])) packageLine = index
    if (/^\s*import\s+/.test(lines[index])) lastImport = index
  }
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, block)
    return lines.join('\n')
  }
  if (packageLine >= 0) {
    const afterPackage = packageLine + 1
    const hasBlank = lines[afterPackage] === ''
    const at = hasBlank ? afterPackage + 1 : afterPackage
    const leading = hasBlank ? [block] : ['', block]
    const next = lines[at]
    const trailing = next ? [''] : []
    lines.splice(at, 0, ...leading, ...trailing)
    return lines.join('\n')
  }
  const trailing = lines[0] ? [''] : []
  lines.unshift(block, ...trailing)
  return lines.join('\n')
}

export function applyMissingJavaImports(source: string, catalog: JavaImportCatalog): string {
  return insertJavaImports(source, missingImportQualifiedNames(source, catalog))
}

function offsetToPosition(source: string, offset: number): { lineNumber: number; column: number } {
  const before = source.slice(0, offset)
  const lines = before.split('\n')
  return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 }
}

export function textEditBetween(before: string, after: string): JavaTextEdit | null {
  if (before === after) return null
  let start = 0
  const maxStart = Math.min(before.length, after.length)
  while (start < maxStart && before[start] === after[start]) start += 1
  let beforeEnd = before.length
  let afterEnd = after.length
  while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
    beforeEnd -= 1
    afterEnd -= 1
  }
  const from = offsetToPosition(before, start)
  const to = offsetToPosition(before, beforeEnd)
  return {
    startLineNumber: from.lineNumber,
    startColumn: from.column,
    endLineNumber: to.lineNumber,
    endColumn: to.column,
    text: after.slice(start, afterEnd),
  }
}

export function shouldAttemptJavaAutoImport(changeText: string, catalog: JavaImportCatalog): boolean {
  if (!changeText) return false
  if (catalog.has(changeText)) return true
  if (changeText.includes('\n')) return true
  return /[\s<(,;[\]).]/.test(changeText[changeText.length - 1] ?? '')
}
