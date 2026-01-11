#!/usr/bin/env node
/**
 * Скрипт для проверки, что все изображения значков правильно копируются при билде
 * Запускать после npm run build
 */

import { existsSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

const root = process.cwd()
const publicDir = join(root, 'public', 'Новые значки', 'За личные достижения')
const distDir = join(root, 'dist', 'RL-Guide-book', 'Новые значки', 'За личные достижения')

console.log('🔍 Проверка копирования изображений значков...\n')

if (!existsSync(publicDir)) {
  console.error('❌ Папка public/Новые значки/За личные достижения не найдена!')
  process.exit(1)
}

if (!existsSync(distDir)) {
  console.error('❌ Папка dist/RL-Guide-book/Новые значки/За личные достижения не найдена!')
  console.error('   Запустите npm run build перед проверкой')
  process.exit(1)
}

function countImages(dir) {
  let count = 0
  const files = []
  
  function traverse(currentDir) {
    if (!existsSync(currentDir)) return
    
    const entries = readdirSync(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)
      
      if (entry.isDirectory()) {
        traverse(fullPath)
      } else if (entry.isFile()) {
        const ext = entry.name.toLowerCase().split('.').pop()
        if (['jpg', 'jpeg', 'png'].includes(ext)) {
          count++
          files.push(fullPath)
        }
      }
    }
  }
  
  traverse(dir)
  return { count, files }
}

const publicStats = countImages(publicDir)
const distStats = countImages(distDir)

console.log(`📊 Статистика:`)
console.log(`   Public: ${publicStats.count} изображений`)
console.log(`   Dist:   ${distStats.count} изображений\n`)

if (publicStats.count === distStats.count) {
  console.log('✅ Все изображения успешно скопированы!')
  
  // Проверяем несколько конкретных файлов
  console.log('\n🔍 Проверка конкретных файлов:')
  const testFiles = [
    'валюша/реализм/1 валюша.jpg',
    'валюша/реализм/2 Помнящий Факты.jpg',
    'валюша/реализм/3 Настоящий Валюша.jpg',
    'реальный победитель/реализм/1 реальный победитель.jpg',
    'реальный умник/реализм/1 реальный умник.jpg'
  ]
  
  let allFound = true
  for (const testFile of testFiles) {
    const distPath = join(distDir, testFile)
    const exists = existsSync(distPath)
    console.log(`   ${exists ? '✅' : '❌'} ${testFile}`)
    if (!exists) allFound = false
  }
  
  if (allFound) {
    console.log('\n🎉 Все проверки пройдены успешно!')
    process.exit(0)
  } else {
    console.log('\n⚠️  Некоторые файлы не найдены в dist!')
    process.exit(1)
  }
} else {
  console.error('❌ Количество изображений не совпадает!')
  console.error(`   Ожидалось: ${publicStats.count}, Найдено: ${distStats.count}`)
  
  // Находим отсутствующие файлы
  const publicFiles = publicStats.files.map(f => f.replace(publicDir, '').replace(/\\/g, '/'))
  const distFiles = distStats.files.map(f => f.replace(distDir, '').replace(/\\/g, '/'))
  
  const missing = publicFiles.filter(f => !distFiles.includes(f))
  if (missing.length > 0) {
    console.error(`\n❌ Отсутствующие файлы (${missing.length}):`)
    missing.slice(0, 10).forEach(f => console.error(`   - ${f}`))
    if (missing.length > 10) {
      console.error(`   ... и еще ${missing.length - 10} файлов`)
    }
  }
  
  process.exit(1)
}
