import { describe, expect, it } from 'vitest'
import {
  applyMissingJavaImports,
  catalogForFiles,
  isJavaImportNeeded,
  missingImportQualifiedNames,
  parseJavaDeclaredTypes,
  shouldAttemptJavaAutoImport,
  textEditBetween,
} from './javaAutoImport'

const catalog = catalogForFiles([
  {
    content: [
      'package com.coditto.demo;',
      '',
      'public record RoleChangeRequest(String currentRole, String requestedRole, boolean approved) {',
      '}',
    ].join('\n'),
  },
])

describe('java auto import', () => {
  it('parses package types from workspace files into the catalog', () => {
    expect(parseJavaDeclaredTypes([
      'package com.coditto.demo;',
      'public record RoleChangeRequest(String currentRole) {}',
    ].join('\n'))).toEqual([
      { simpleName: 'RoleChangeRequest', qualifiedName: 'com.coditto.demo.RoleChangeRequest' },
    ])
    expect(catalog.get('RoleChangeRequest')).toBe('com.coditto.demo.RoleChangeRequest')
    expect(catalog.get('ArrayList')).toBe('java.util.ArrayList')
  })

  it('adds an import when a known type is used after a package declaration', () => {
    const source = [
      'package com.coditto.demo;',
      '',
      'public final class RoleService {',
      '    public java.util.List unused() { return new ArrayList<>(); }',
      '}',
    ].join('\n')

    expect(applyMissingJavaImports(source, catalog)).toBe([
      'package com.coditto.demo;',
      '',
      'import java.util.ArrayList;',
      '',
      'public final class RoleService {',
      '    public java.util.List unused() { return new ArrayList<>(); }',
      '}',
    ].join('\n'))
  })

  it('appends after existing imports and names both missing types', () => {
    const source = [
      'package policy;',
      '',
      'import role.Role;',
      '',
      'public class Demo {',
      '    List<HashMap<String, Role>> values;',
      '}',
    ].join('\n')

    expect(missingImportQualifiedNames(source, catalog)).toEqual([
      'java.util.HashMap',
      'java.util.List',
    ])
    expect(applyMissingJavaImports(source, catalog)).toContain('import java.util.HashMap;')
    expect(applyMissingJavaImports(source, catalog)).toContain('import java.util.List;')
    expect(applyMissingJavaImports(source, catalog)).toContain('import role.Role;')
  })

  it('skips java.lang types, comments, strings, and the type declared in the file', () => {
    const source = [
      'package com.coditto.demo;',
      '',
      'public final class RoleService {',
      '    // ArrayList should stay local',
      '    String label = "HashMap";',
      '    public String name() { return "ok"; }',
      '}',
    ].join('\n')

    expect(missingImportQualifiedNames(source, catalog)).toEqual([])
  })

  it('skips same-package types and imports already present including wildcards', () => {
    const withSamePackage = [
      'package com.coditto.demo;',
      '',
      'public final class RoleService {',
      '    RoleChangeRequest request;',
      '}',
    ].join('\n')
    expect(isJavaImportNeeded(withSamePackage, 'com.coditto.demo.RoleChangeRequest')).toBe(false)

    const withWildcard = [
      'package demo;',
      '',
      'import java.util.*;',
      '',
      'public class Demo {',
      '    ArrayList<String> values;',
      '}',
    ].join('\n')
    expect(missingImportQualifiedNames(withWildcard, catalog)).toEqual([])
  })

  it('adds a Spring annotation import and keeps a completion trigger for the simple name', () => {
    const source = [
      'package com.likelion.springboot.member.service;',
      '',
      'public class MemberService {',
      '}',
    ].join('\n')
    const withAnnotation = source.replace(
      'public class MemberService {',
      '@Service\npublic class MemberService {',
    )

    expect(applyMissingJavaImports(withAnnotation, catalog)).toContain(
      'import org.springframework.stereotype.Service;',
    )
    expect(shouldAttemptJavaAutoImport('ArrayList', catalog)).toBe(true)
    expect(shouldAttemptJavaAutoImport('List<', catalog)).toBe(true)
    expect(shouldAttemptJavaAutoImport('Li', catalog)).toBe(false)
  })

  it('does not treat ListItem as List', () => {
    const source = [
      'package demo;',
      '',
      'public class Demo {',
      '    ListItem value;',
      '}',
    ].join('\n')
    expect(missingImportQualifiedNames(source, catalog)).toEqual([])
  })

  it('describes a prefix insert so the editor can keep the cursor', () => {
    const before = 'package demo;\n\nclass Demo { ArrayList<String> values; }\n'
    const after = applyMissingJavaImports(before, catalog)
    const edit = textEditBetween(before, after)
    expect(edit).toEqual({
      startLineNumber: 3,
      startColumn: 1,
      endLineNumber: 3,
      endColumn: 1,
      text: 'import java.util.ArrayList;\n\n',
    })
  })
})
