-- Crear tabla provisiones
CREATE TABLE IF NOT EXISTS provisiones (
  id SERIAL PRIMARY KEY,
  gasto_fijo_id INTEGER REFERENCES gastos_fijos(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto_provision DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
  fecha_pago DATE,
  gasto_id INTEGER REFERENCES gastos(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejor performance
CREATE INDEX idx_provisiones_estado ON provisiones(estado);
CREATE INDEX idx_provisiones_fecha_vencimiento ON provisiones(fecha_vencimiento);
CREATE INDEX idx_provisiones_gasto_fijo ON provisiones(gasto_fijo_id);
CREATE INDEX idx_provisiones_mes_anio ON provisiones(mes, anio);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_provisiones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provisiones_updated_at
  BEFORE UPDATE ON provisiones
  FOR EACH ROW
  EXECUTE FUNCTION update_provisiones_updated_at();

-- Comentarios
COMMENT ON TABLE provisiones IS 'Provisiones mensuales generadas desde gastos fijos';
COMMENT ON COLUMN provisiones.estado IS 'pendiente, pagada, cancelada';
COMMENT ON COLUMN provisiones.gasto_id IS 'Referencia al gasto real cuando se paga la provisión';
