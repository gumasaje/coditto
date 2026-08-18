import { describe, expect, it } from 'vitest'
import { findJavaImportFoldRange } from './javaImportFolding'

describe('findJavaImportFoldRange', () => {
  it('folds consecutive imports after a package declaration as one range', () => {
    const source = [
      'package com.coditto.demo;',
      '',
      'import java.util.List;',
      'import java.util.Map;',
      'import com.coditto.demo.Role;',
      '',
      'public final class Demo {}',
      '',
    ].join('\n')

    expect(findJavaImportFoldRange(source)).toEqual({ start: 3, end: 5 })
  })

  it('keeps blank lines between import groups inside the same range', () => {
    const source = [
      'package bonus;',
      '',
      'import role.Role;',
      '',
      'import java.util.ArrayList;',
      'import java.util.HashMap;',
      '',
      'public class MemoryMemberRepository {}',
      '',
    ].join('\n')

    expect(findJavaImportFoldRange(source)).toEqual({ start: 3, end: 6 })
  })

  it('includes static and wildcard imports', () => {
    const source = [
      'import static org.junit.jupiter.api.Assertions.assertEquals;',
      'import java.util.*;',
      'class Demo {}',
    ].join('\n')

    expect(findJavaImportFoldRange(source)).toEqual({ start: 1, end: 2 })
  })

  it('does not fold a single import', () => {
    const source = [
      'package demo;',
      '',
      'import role.Role;',
      '',
      'class Demo {}',
    ].join('\n')

    expect(findJavaImportFoldRange(source)).toBeNull()
  })

  it('returns null when there are no imports', () => {
    expect(findJavaImportFoldRange('package demo;\n\nclass Demo {}\n')).toBeNull()
  })

  it('stops at the first non-import after the import section', () => {
    const source = [
      'import a.A;',
      'import b.B;',
      'import c.C;',
      '@Service',
      'class Demo {',
      '    import d.D;',
      '}',
    ].join('\n')

    expect(findJavaImportFoldRange(source)).toEqual({ start: 1, end: 3 })
  })
})
