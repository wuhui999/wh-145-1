from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    DISPATCHER = "dispatcher"
    OPERATOR = "operator"
    CUSTOMER_SERVICE = "customer_service"


class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class CabinetBase(BaseModel):
    cabinet_no: str
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    total_slots: int = 12
    status: str = "online"


class CabinetCreate(CabinetBase):
    pass


class CabinetResponse(CabinetBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CabinetWithStats(CabinetResponse):
    available_slots: int = 0
    fault_slots: int = 0
    low_battery_count: int = 0
    avg_soc: float = 0.0


class SlotBase(BaseModel):
    slot_no: str
    cabinet_id: int
    status: str = "empty"
    battery_id: Optional[int] = None


class SlotCreate(SlotBase):
    pass


class SlotResponse(SlotBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True


class SlotWithBattery(SlotResponse):
    battery: Optional["BatteryResponse"] = None


class BatteryBase(BaseModel):
    battery_no: str
    model: Optional[str] = None
    capacity: int = 60
    current_soc: float = 100.0
    cycle_count: int = 0
    health_score: float = 100.0
    status: str = "in_use"
    manufacture_date: Optional[datetime] = None


class BatteryCreate(BatteryBase):
    pass


class BatteryUpdate(BaseModel):
    current_soc: Optional[float] = None
    status: Optional[str] = None
    health_score: Optional[float] = None
    cycle_count: Optional[int] = None


class BatteryResponse(BatteryBase):
    id: int
    created_at: datetime
    last_maintenance: Optional[datetime] = None

    class Config:
        from_attributes = True


class BatteryWithDetail(BatteryResponse):
    maintenance_records: List["MaintenanceRecordResponse"] = []


class MaintenanceRecordBase(BaseModel):
    battery_id: int
    type: str
    description: Optional[str] = None
    operator: Optional[str] = None
    result: Optional[str] = None


class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass


class MaintenanceRecordResponse(MaintenanceRecordBase):
    id: int
    date: datetime

    class Config:
        from_attributes = True


class WorkOrderType(str, Enum):
    LOW_BATTERY = "low_battery"
    FAULT = "fault"
    COMPLAINT = "complaint"


class WorkOrderPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class WorkOrderStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class WorkOrderBase(BaseModel):
    type: str
    priority: str = "normal"
    cabinet_id: int
    slot_id: Optional[int] = None
    battery_id: Optional[int] = None
    description: Optional[str] = None


class WorkOrderCreate(WorkOrderBase):
    pass


class WorkOrderUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None
    remark: Optional[str] = None


class WorkOrderResponse(WorkOrderBase):
    id: int
    order_no: str
    status: str
    assigned_to: Optional[int] = None
    creator_id: Optional[int] = None
    sla_deadline: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    remark: Optional[str] = None

    class Config:
        from_attributes = True


class WorkOrderWithDetail(WorkOrderResponse):
    cabinet: Optional[CabinetResponse] = None
    battery: Optional[BatteryResponse] = None


class PathPoint(BaseModel):
    order_id: int
    order_no: str
    cabinet_name: str
    address: str
    latitude: float
    longitude: float
    type: str
    priority: str
    distance: float = 0.0
    estimated_time: int = 0


class PathSuggestion(BaseModel):
    origin_lat: float
    origin_lng: float
    total_distance: float
    total_estimated_time: int
    points: List[PathPoint]


class StatsOverview(BaseModel):
    total_cabinets: int
    online_cabinets: int
    total_batteries: int
    active_batteries: int
    pending_orders: int
    today_swaps: int
    avg_health_score: float
    scrapped_batteries: int


class SwapRecordResponse(BaseModel):
    id: int
    record_no: str
    cabinet_id: int
    slot_id: int
    old_battery_id: int
    new_battery_id: int
    swap_time: datetime
    old_soc: Optional[float] = None
    new_soc: Optional[float] = None

    class Config:
        from_attributes = True
