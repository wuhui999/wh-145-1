from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), nullable=False)  # admin, dispatcher, operator, customer_service
    phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)


class Cabinet(Base):
    __tablename__ = "cabinets"

    id = Column(Integer, primary_key=True, index=True)
    cabinet_no = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    address = Column(String(255))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_slots = Column(Integer, default=12)
    status = Column(String(20), default="online")  # online, offline, maintenance
    created_at = Column(DateTime, default=datetime.utcnow)

    slots = relationship("Slot", back_populates="cabinet")


class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    slot_no = Column(String(20), nullable=False)
    cabinet_id = Column(Integer, ForeignKey("cabinets.id"), nullable=False)
    status = Column(String(20), default="empty")  # empty, occupied, fault, locked
    battery_id = Column(Integer, ForeignKey("batteries.id"), nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cabinet = relationship("Cabinet", back_populates="slots")
    battery = relationship("Battery", back_populates="current_slot")


class Battery(Base):
    __tablename__ = "batteries"

    id = Column(Integer, primary_key=True, index=True)
    battery_no = Column(String(50), unique=True, index=True, nullable=False)
    model = Column(String(50))
    capacity = Column(Integer, default=60)  # Ah
    current_soc = Column(Float, default=100.0)  # State of Charge %
    cycle_count = Column(Integer, default=0)
    health_score = Column(Float, default=100.0)  # 0-100
    status = Column(String(20), default="in_use")  # in_use, charging, maintenance, scrapped
    manufacture_date = Column(DateTime)
    last_maintenance = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    current_slot = relationship("Slot", back_populates="battery", uselist=False)
    maintenance_records = relationship("MaintenanceRecord", back_populates="battery")


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    battery_id = Column(Integer, ForeignKey("batteries.id"), nullable=False)
    type = Column(String(50))  # repair, calibration, inspection
    description = Column(Text)
    operator = Column(String(100))
    date = Column(DateTime, default=datetime.utcnow)
    result = Column(String(255))

    battery = relationship("Battery", back_populates="maintenance_records")


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, index=True, nullable=False)
    type = Column(String(30), nullable=False)  # low_battery, fault, complaint
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    status = Column(String(20), default="pending")  # pending, assigned, in_progress, completed, cancelled
    cabinet_id = Column(Integer, ForeignKey("cabinets.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=True)
    battery_id = Column(Integer, ForeignKey("batteries.id"), nullable=True)
    description = Column(Text)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sla_deadline = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    remark = Column(Text)

    cabinet = relationship("Cabinet", foreign_keys=[cabinet_id])
    slot = relationship("Slot", foreign_keys=[slot_id])
    battery = relationship("Battery", foreign_keys=[battery_id])


class SwapRecord(Base):
    __tablename__ = "swap_records"

    id = Column(Integer, primary_key=True, index=True)
    record_no = Column(String(50), unique=True, index=True, nullable=False)
    cabinet_id = Column(Integer, ForeignKey("cabinets.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=False)
    old_battery_id = Column(Integer, ForeignKey("batteries.id"), nullable=False)
    new_battery_id = Column(Integer, ForeignKey("batteries.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    swap_time = Column(DateTime, default=datetime.utcnow)
    old_soc = Column(Float)
    new_soc = Column(Float)

    cabinet = relationship("Cabinet")
