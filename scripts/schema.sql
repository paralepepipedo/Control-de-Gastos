-- ============================================
-- CONTROL FINANCIERO - SCHEMA SUPABASE
-- Base de datos completa
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CATEGORÍAS
CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('efectivo', 'tarjeta', 'ambos')),
  es_fijo BOOLEAN DEFAULT false,
  icono VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO categorias (nombre, tipo, es_fijo, icono, color) VALUES
  ('Crédito Scotia', 'efectivo', true, '💳', '#ef4444'),
  ('Hipotecario', 'efectivo', true, '🏠', '#f59e0b'),
  ('Colegio', 'efectivo', true, '🎓', '#3b82f6'),
  ('Pensión Marti', 'efectivo', true, '👨‍👩‍👧', '#8b5cf6'),
  ('TC Itaú', 'efectivo', true, '💳', '#ec4899'),
  ('TC Scotia', 'efectivo', true, '💳', '#ef4444'),
  ('TC Chile', 'efectivo', true, '💳', '#06b6d4'),
  ('Línea Scotia', 'efectivo', true, '📊', '#ef4444'),
  ('Línea Chile', 'efectivo', true, '📊', '#06b6d4'),
  ('Línea BCI', 'efectivo', true, '📊', '#f59e0b'),
  ('Línea Itaú', 'efectivo', true, '📊', '#ec4899'),
  ('Bencina', 'tarjeta', true, '⛽', '#10b981'),
  ('Comida', 'tarjeta', true, '🍔', '#f59e0b'),
  ('Servicios', 'tarjeta', false, '💡', '#3b82f6'),
  ('Transporte', 'ambos', false, '🚗', '#10b981'),
  ('Entretenimiento', 'ambos', false, '🎮', '#8b5cf6'),
  ('Salud', 'ambos', false, '🏥', '#ef4444'),
  ('Otros', 'ambos', false, '📦', '#6b7280');
