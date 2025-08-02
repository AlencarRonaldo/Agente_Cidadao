#!/usr/bin/env node

/**
 * 🔒 MIGRAÇÃO DE SEGURANÇA - Adicionar Tabela de Auditoria
 * 
 * Este script adiciona a tabela AdminAuditLog ao banco de dados
 * para suportar o sistema de auditoria de segurança LGPD-compliant.
 * 
 * Execute com: node scripts/migrate-security-schema.js
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../src/utils/logger');

const prisma = new PrismaClient();

async function runSecurityMigration() {
  try {
    logger.info('🔒 Iniciando migração de segurança...');

    // Verificar se a tabela já existe
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'AdminAuditLog'
      );
    `;

    if (tableExists[0].exists) {
      logger.info('✅ Tabela AdminAuditLog já existe - migração não necessária');
      return;
    }

    // Criar tabela de auditoria manualmente (caso Prisma migrate não funcione)
    await prisma.$executeRaw`
      CREATE TABLE "AdminAuditLog" (
        "id" TEXT NOT NULL,
        "adminUserId" TEXT NOT NULL,
        "adminEmail" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "targetType" TEXT NOT NULL,
        "targetId" TEXT NOT NULL,
        "details" JSONB,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
      );
    `;

    // Criar índices para performance
    await prisma.$executeRaw`
      CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX "AdminAuditLog_timestamp_idx" ON "AdminAuditLog"("timestamp");
    `;

    // Verificar se é necessário adicionar o campo metadata à tabela Denuncia
    const metadataColumnExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'Denuncia' 
        AND column_name = 'metadata'
      );
    `;

    if (!metadataColumnExists[0].exists) {
      logger.info('➕ Adicionando campo metadata à tabela Denuncia...');
      await prisma.$executeRaw`
        ALTER TABLE "Denuncia" ADD COLUMN "metadata" JSONB;
      `;
    }

    // Verificar se os novos status existem no enum
    try {
      await prisma.$executeRaw`
        ALTER TYPE "Status" ADD VALUE IF NOT EXISTS 'NAO_ENCONTRADA';
      `;
      await prisma.$executeRaw`
        ALTER TYPE "Status" ADD VALUE IF NOT EXISTS 'TEXTO_INVALIDO';
      `;
    } catch (enumError) {
      logger.warn('⚠️ Possível erro ao adicionar valores ao enum Status (pode já existir):', enumError.message);
    }

    // Criar registro inicial de auditoria para marcar a migração
    const migrationAudit = await prisma.adminAuditLog.create({
      data: {
        adminUserId: 'SYSTEM',
        adminEmail: 'system@migration',
        action: 'SECURITY_MIGRATION',
        targetType: 'SYSTEM',
        targetId: 'database_schema',
        details: {
          migration: 'security_audit_table',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          changes: [
            'Added AdminAuditLog table',
            'Added metadata column to Denuncia',
            'Added new Status enum values',
            'Created security audit indexes'
          ]
        },
        ipAddress: 'localhost',
        userAgent: 'migration-script',
        timestamp: new Date()
      }
    });

    logger.info('✅ Migração de segurança concluída com sucesso!');
    logger.info(`📋 ID do registro de auditoria: ${migrationAudit.id}`);

    // Verificar integridade das tabelas
    const auditCount = await prisma.adminAuditLog.count();
    logger.info(`📊 Total de registros de auditoria: ${auditCount}`);

    return {
      success: true,
      message: 'Migração de segurança concluída',
      auditId: migrationAudit.id
    };

  } catch (error) {
    logger.error('❌ Erro na migração de segurança:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar migração se chamado diretamente
if (require.main === module) {
  runSecurityMigration()
    .then(result => {
      console.log('🔒 Migração de segurança concluída:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { runSecurityMigration };