from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import random
import math

from database import engine, SessionLocal, Base
import models
import schemas
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_role, get_db
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="共享换电柜运营平台 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_db():
    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            users = [
                {"username": "admin", "password": "admin123", "full_name": "系统管理员", "role": "admin", "phone": "13800000001"},
                {"username": "dispatcher", "password": "disp123", "full_name": "张调度", "role": "dispatcher", "phone": "13800000002"},
                {"username": "operator1", "password": "oper123", "full_name": "李运维", "role": "operator", "phone": "13800000003"},
                {"username": "operator2", "password": "oper456", "full_name": "王运维", "role": "operator", "phone": "13800000004"},
                {"username": "cs1", "password": "cs123", "full_name": "赵客服", "role": "customer_service", "phone": "13800000005"},
            ]
            for u in users:
                user = models.User(
                    username=u["username"],
                    password_hash=hash_password(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    phone=u["phone"]
                )
                db.add(user)
            db.commit()

        if db.query(models.Cabinet).count() == 0:
            cabinets_data = [
                {"no": "CAB001", "name": "中关村换电站", "address": "北京市海淀区中关村大街1号", "lat": 39.9847, "lng": 116.3046, "slots": 12},
                {"no": "CAB002", "name": "国贸换电站", "address": "北京市朝阳区建国门外大街1号", "lat": 39.9087, "lng": 116.4605, "slots": 16},
                {"no": "CAB003", "name": "望京换电站", "address": "北京市朝阳区望京街道阜通东大街6号", "lat": 39.9966, "lng": 116.4774, "slots": 12},
                {"no": "CAB004", "name": "西单换电站", "address": "北京市西城区西单北大街130号", "lat": 39.9135, "lng": 116.3741, "slots": 10},
                {"no": "CAB005", "name": "五道口换电站", "address": "北京市海淀区成府路28号", "lat": 39.9929, "lng": 116.3412, "slots": 14},
                {"no": "CAB006", "name": "三里屯换电站", "address": "北京市朝阳区三里屯路19号", "lat": 39.9375, "lng": 116.4550, "slots": 12},
            ]
            for c in cabinets_data:
                cabinet = models.Cabinet(
                    cabinet_no=c["no"],
                    name=c["name"],
                    address=c["address"],
                    latitude=c["lat"],
                    longitude=c["lng"],
                    total_slots=c["slots"],
                    status="online"
                )
                db.add(cabinet)
            db.commit()

            cabinets = db.query(models.Cabinet).all()
            slot_statuses = ["empty", "occupied", "occupied", "occupied", "fault", "occupied", "occupied", "empty"]
            for cab in cabinets:
                for i in range(cab.total_slots):
                    status = random.choice(slot_statuses) if i > 2 else "occupied"
                    slot = models.Slot(
                        slot_no=f"{cab.cabinet_no}-S{i+1:02d}",
                        cabinet_id=cab.id,
                        status=status,
                        battery_id=None
                    )
                    db.add(slot)
            db.commit()

        if db.query(models.Battery).count() == 0:
            battery_models = ["CATL-60Ah", "BYD-70Ah", "LG-50Ah", "CATL-80Ah"]
            for i in range(60):
                health = max(40.0, min(100.0, random.gauss(85, 12)))
                soc = max(10.0, min(100.0, random.gauss(75, 20)))
                cycles = random.randint(50, 800)
                status = "in_use"
                if health < 50:
                    status = "maintenance"
                battery = models.Battery(
                    battery_no=f"BAT{i+1:04d}",
                    model=random.choice(battery_models),
                    capacity=random.choice([50, 60, 70, 80]),
                    current_soc=soc,
                    cycle_count=cycles,
                    health_score=health,
                    status=status,
                    manufacture_date=datetime(2022, random.randint(1, 12), random.randint(1, 28))
                )
                db.add(battery)
            db.commit()

            slots = db.query(models.Slot).filter(models.Slot.status == "occupied").all()
            batteries = db.query(models.Battery).filter(models.Battery.status == "in_use").all()
            for i, slot in enumerate(slots):
                if i < len(batteries):
                    slot.battery_id = batteries[i].id
            db.commit()

        if db.query(models.WorkOrder).count() == 0:
            cabinets = db.query(models.Cabinet).all()
            order_types = ["low_battery", "fault", "complaint"]
            priorities = ["low", "normal", "high", "urgent"]
            statuses = ["pending", "assigned", "in_progress", "completed"]
            operators = db.query(models.User).filter(models.User.role == "operator").all()

            for i in range(15):
                cab = random.choice(cabinets)
                o_type = random.choice(order_types)
                priority = random.choice(priorities) if o_type != "complaint" else random.choice(["high", "urgent"])
                status = random.choice(statuses)
                assigned = random.choice(operators) if status in ["assigned", "in_progress", "completed"] else None

                sla_hours = {"low": 48, "normal": 24, "high": 8, "urgent": 2}[priority]
                created = datetime.utcnow() - timedelta(hours=random.randint(0, 20))

                order = models.WorkOrder(
                    order_no=f"WO{datetime.now().strftime('%Y%m%d')}{i+1:04d}",
                    type=o_type,
                    priority=priority,
                    status=status,
                    cabinet_id=cab.id,
                    description={
                        "low_battery": f"柜机 {cab.name} 多个电池电量低于20%，需要更换",
                        "fault": f"柜机 {cab.name} 格口故障，无法正常使用",
                        "complaint": f"用户投诉 {cab.name} 换电体验差，要求处理"
                    }[o_type],
                    assigned_to=assigned.id if assigned else None,
                    sla_deadline=created + timedelta(hours=sla_hours),
                    created_at=created,
                    updated_at=created,
                    completed_at=created + timedelta(hours=random.randint(1, 5)) if status == "completed" else None
                )
                db.add(order)
            db.commit()

        if db.query(models.MaintenanceRecord).count() == 0:
            batteries = db.query(models.Battery).all()
            for bat in random.sample(batteries, 20):
                for _ in range(random.randint(1, 3)):
                    record = models.MaintenanceRecord(
                        battery_id=bat.id,
                        type=random.choice(["inspection", "calibration", "repair"]),
                        description=random.choice([
                            "常规电池健康检查",
                            "BMS系统校准",
                            "更换电芯",
                            "散热系统维护",
                            "连接器清洁"
                        ]),
                        operator=random.choice(["张工", "李工", "王工"]),
                        date=datetime(2023, random.randint(1, 12), random.randint(1, 28)),
                        result="正常"
                    )
                    db.add(record)
            db.commit()

        if db.query(models.SwapRecord).count() == 0:
            cabinets = db.query(models.Cabinet).all()
            batteries = db.query(models.Battery).all()
            operators = db.query(models.User).filter(models.User.role == "operator").all()

            for i in range(50):
                cab = random.choice(cabinets)
                slots = db.query(models.Slot).filter(models.Slot.cabinet_id == cab.id).all()
                if not slots:
                    continue
                slot = random.choice(slots)
                old_bat = random.choice(batteries)
                new_bat = random.choice(batteries)

                record = models.SwapRecord(
                    record_no=f"SW{datetime.now().strftime('%Y%m%d')}{i+1:05d}",
                    cabinet_id=cab.id,
                    slot_id=slot.id,
                    old_battery_id=old_bat.id,
                    new_battery_id=new_bat.id,
                    operator_id=random.choice(operators).id if operators else None,
                    swap_time=datetime.utcnow() - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23)),
                    old_soc=random.uniform(5, 30),
                    new_soc=random.uniform(85, 100)
                )
                db.add(record)
            db.commit()

    finally:
        db.close()


init_db()


@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    access_token = create_access_token(data={"sub": user.username})
    return schemas.TokenResponse(access_token=access_token, user=schemas.UserResponse.model_validate(user))


@app.get("/api/auth/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.get("/api/users", response_model=List[schemas.UserResponse])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    return query.all()


@app.get("/api/cabinets", response_model=List[schemas.CabinetWithStats])
def list_cabinets(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Cabinet)
    if status:
        query = query.filter(models.Cabinet.status == status)
    cabinets = query.all()

    result = []
    for cab in cabinets:
        slots = db.query(models.Slot).filter(models.Slot.cabinet_id == cab.id).all()
        available = sum(1 for s in slots if s.status == "empty")
        fault = sum(1 for s in slots if s.status == "fault")
        low_count = 0
        total_soc = 0
        bat_count = 0
        for slot in slots:
            if slot.battery_id:
                bat = db.query(models.Battery).filter(models.Battery.id == slot.battery_id).first()
                if bat:
                    total_soc += bat.current_soc
                    bat_count += 1
                    if bat.current_soc < 20:
                        low_count += 1

        cab_data = schemas.CabinetWithStats.model_validate(cab)
        cab_data.available_slots = available
        cab_data.fault_slots = fault
        cab_data.low_battery_count = low_count
        cab_data.avg_soc = round(total_soc / bat_count, 1) if bat_count > 0 else 0
        result.append(cab_data)
    return result


@app.get("/api/cabinets/{cabinet_id}", response_model=schemas.CabinetResponse)
def get_cabinet(
    cabinet_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    cabinet = db.query(models.Cabinet).filter(models.Cabinet.id == cabinet_id).first()
    if not cabinet:
        raise HTTPException(status_code=404, detail="Cabinet not found")
    return cabinet


@app.get("/api/cabinets/{cabinet_id}/slots", response_model=List[schemas.SlotWithBattery])
def get_cabinet_slots(
    cabinet_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    slots = db.query(models.Slot).filter(models.Slot.cabinet_id == cabinet_id).all()
    result = []
    for slot in slots:
        slot_data = schemas.SlotWithBattery.model_validate(slot)
        if slot.battery_id:
            battery = db.query(models.Battery).filter(models.Battery.id == slot.battery_id).first()
            if battery:
                slot_data.battery = schemas.BatteryResponse.model_validate(battery)
        result.append(slot_data)
    return result


@app.get("/api/slots/{slot_id}", response_model=schemas.SlotWithBattery)
def get_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    slot = db.query(models.Slot).filter(models.Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot_data = schemas.SlotWithBattery.model_validate(slot)
    if slot.battery_id:
        battery = db.query(models.Battery).filter(models.Battery.id == slot.battery_id).first()
        if battery:
            slot_data.battery = schemas.BatteryResponse.model_validate(battery)
    return slot_data


@app.put("/api/slots/{slot_id}")
def update_slot(
    slot_id: int,
    slot_update: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "dispatcher"]))
):
    slot = db.query(models.Slot).filter(models.Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    for key, value in slot_update.items():
        if hasattr(slot, key):
            setattr(slot, key, value)
    db.commit()
    return {"message": "Slot updated successfully"}


@app.get("/api/batteries", response_model=List[schemas.BatteryResponse])
def list_batteries(
    status: Optional[str] = None,
    health_min: Optional[float] = None,
    health_max: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Battery)
    if status:
        query = query.filter(models.Battery.status == status)
    if health_min is not None:
        query = query.filter(models.Battery.health_score >= health_min)
    if health_max is not None:
        query = query.filter(models.Battery.health_score <= health_max)
    return query.all()


@app.get("/api/batteries/{battery_id}", response_model=schemas.BatteryWithDetail)
def get_battery(
    battery_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")
    bat_data = schemas.BatteryWithDetail.model_validate(battery)
    bat_data.maintenance_records = [
        schemas.MaintenanceRecordResponse.model_validate(r)
        for r in battery.maintenance_records
    ]
    return bat_data


@app.put("/api/batteries/{battery_id}", response_model=schemas.BatteryResponse)
def update_battery(
    battery_id: int,
    battery_update: schemas.BatteryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "dispatcher", "operator"]))
):
    battery = db.query(models.Battery).filter(models.Battery.id == battery_id).first()
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")
    
    update_data = battery_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(battery, key, value)
    
    if battery.health_score is not None and battery.health_score < 50 and battery.status == "in_use":
        battery.status = "maintenance"
    
    db.commit()
    db.refresh(battery)
    return battery


@app.get("/api/work-orders", response_model=List[schemas.WorkOrderWithDetail])
def list_work_orders(
    status: Optional[str] = None,
    type: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.WorkOrder)
    if status:
        query = query.filter(models.WorkOrder.status == status)
    if type:
        query = query.filter(models.WorkOrder.type == type)
    if priority:
        query = query.filter(models.WorkOrder.priority == priority)
    if assigned_to:
        query = query.filter(models.WorkOrder.assigned_to == assigned_to)
    
    orders = query.order_by(models.WorkOrder.created_at.desc()).all()
    result = []
    for order in orders:
        order_data = schemas.WorkOrderWithDetail.model_validate(order)
        order_data.cabinet = schemas.CabinetResponse.model_validate(order.cabinet) if order.cabinet else None
        order_data.battery = schemas.BatteryResponse.model_validate(order.battery) if order.battery else None
        result.append(order_data)
    return result


@app.get("/api/work-orders/{order_id}", response_model=schemas.WorkOrderWithDetail)
def get_work_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    order = db.query(models.WorkOrder).filter(models.WorkOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    order_data = schemas.WorkOrderWithDetail.model_validate(order)
    order_data.cabinet = schemas.CabinetResponse.model_validate(order.cabinet) if order.cabinet else None
    order_data.battery = schemas.BatteryResponse.model_validate(order.battery) if order.battery else None
    return order_data


@app.post("/api/work-orders", response_model=schemas.WorkOrderResponse)
def create_work_order(
    order: schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    order_no = f"WO{datetime.now().strftime('%Y%m%d%H%M%S')}{random.randint(1000, 9999)}"
    
    sla_hours = {"low": 48, "normal": 24, "high": 8, "urgent": 2}.get(order.priority, 24)
    
    db_order = models.WorkOrder(
        order_no=order_no,
        type=order.type,
        priority=order.priority,
        status="pending",
        cabinet_id=order.cabinet_id,
        slot_id=order.slot_id,
        battery_id=order.battery_id,
        description=order.description,
        creator_id=current_user.id,
        sla_deadline=datetime.utcnow() + timedelta(hours=sla_hours)
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@app.put("/api/work-orders/{order_id}", response_model=schemas.WorkOrderResponse)
def update_work_order(
    order_id: int,
    order_update: schemas.WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    order = db.query(models.WorkOrder).filter(models.WorkOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    update_data = order_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)
    
    if order.status == "completed" and not order.completed_at:
        order.completed_at = datetime.utcnow()
    
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


@app.post("/api/path/suggest", response_model=schemas.PathSuggestion)
def suggest_path(
    request: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    origin_lat = request.get("origin_lat", 39.95)
    origin_lng = request.get("origin_lng", 116.40)
    order_ids = request.get("order_ids")

    if order_ids:
        orders = db.query(models.WorkOrder).filter(
            models.WorkOrder.id.in_(order_ids),
            models.WorkOrder.status.in_(["pending", "assigned"])
        ).all()
    else:
        orders = db.query(models.WorkOrder).filter(
            models.WorkOrder.status.in_(["pending", "assigned"])
        ).all()

    def calc_distance(lat1, lng1, lat2, lng2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c

    cabinet_map = {}
    for order in orders:
        cabinet = order.cabinet
        if not cabinet:
            continue
        cab_key = cabinet.id
        if cab_key not in cabinet_map:
            cabinet_map[cab_key] = {
                "cabinet": cabinet,
                "orders": [],
                "max_priority_weight": 0,
                "min_sla_hours_left": float('inf')
            }
        priority_weight = {"urgent": 100, "high": 50, "normal": 20, "low": 5}.get(order.priority, 20)
        entry = cabinet_map[cab_key]
        entry["orders"].append(order)
        if priority_weight > entry["max_priority_weight"]:
            entry["max_priority_weight"] = priority_weight

        if order.sla_deadline:
            hours_left = (order.sla_deadline - datetime.utcnow()).total_seconds() / 3600
            if hours_left < entry["min_sla_hours_left"]:
                entry["min_sla_hours_left"] = hours_left
        else:
            entry["min_sla_hours_left"] = 999

    cab_points = []
    for cab_key, entry in cabinet_map.items():
        cabinet = entry["cabinet"]
        cab_points.append({
            "cabinet_id": cabinet.id,
            "cabinet": cabinet,
            "latitude": cabinet.latitude,
            "longitude": cabinet.longitude,
            "priority_weight": entry["max_priority_weight"],
            "sla_hours_left": entry["min_sla_hours_left"],
            "orders": entry["orders"]
        })

    def heuristic_sort(cab_list):
        current_lat, current_lng = origin_lat, origin_lng
        sorted_cabs = []
        remaining = cab_list[:]

        while remaining:
            best_idx = 0
            best_score = float('-inf')

            for i, cp in enumerate(remaining):
                dist = calc_distance(current_lat, current_lng, cp["latitude"], cp["longitude"])
                dist_km = max(dist, 0.1)
                pw = cp["priority_weight"]

                sla_bonus = 0
                if cp["sla_hours_left"] < 2:
                    sla_bonus = 80
                elif cp["sla_hours_left"] < 8:
                    sla_bonus = 40
                elif cp["sla_hours_left"] < 24:
                    sla_bonus = 15

                score = pw + sla_bonus - dist_km * 3

                if score > best_score:
                    best_score = score
                    best_idx = i

            next_cab = remaining.pop(best_idx)
            sorted_cabs.append(next_cab)
            current_lat, current_lng = next_cab["latitude"], next_cab["longitude"]

        return sorted_cabs

    sorted_cabs = heuristic_sort(cab_points)

    result_points = []
    cumulative_dist = 0
    prev_lat, prev_lng = origin_lat, origin_lng

    for cp in sorted_cabs:
        segment_dist = calc_distance(prev_lat, prev_lng, cp["latitude"], cp["longitude"])
        cumulative_dist += segment_dist
        segment_time = int(segment_dist / 0.5)

        for order in cp["orders"]:
            point = schemas.PathPoint(
                order_id=order.id,
                order_no=order.order_no,
                cabinet_name=cp["cabinet"].name,
                address=cp["cabinet"].address,
                latitude=cp["cabinet"].latitude,
                longitude=cp["cabinet"].longitude,
                type=order.type,
                priority=order.priority,
                distance=round(segment_dist, 2),
                estimated_time=segment_time
            )
            result_points.append(point)

        prev_lat, prev_lng = cp["latitude"], cp["longitude"]

    total_dist = 0
    total_time = 0
    prev_lat2, prev_lng2 = origin_lat, origin_lng
    for p in result_points:
        d = calc_distance(prev_lat2, prev_lng2, p.latitude, p.longitude)
        total_dist += d
        total_time += int(d / 0.5)
        total_time += 15
        prev_lat2, prev_lng2 = p.latitude, p.longitude

    return schemas.PathSuggestion(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        total_distance=round(total_dist, 2),
        total_estimated_time=total_time,
        points=result_points
    )


@app.get("/api/stats/overview", response_model=schemas.StatsOverview)
def get_stats_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    total_cabinets = db.query(models.Cabinet).count()
    online_cabinets = db.query(models.Cabinet).filter(models.Cabinet.status == "online").count()
    total_batteries = db.query(models.Battery).count()
    active_batteries = db.query(models.Battery).filter(models.Battery.status == "in_use").count()
    pending_orders = db.query(models.WorkOrder).filter(
        models.WorkOrder.status.in_(["pending", "assigned", "in_progress"])
    ).count()
    
    today = datetime.utcnow().date()
    today_swaps = db.query(models.SwapRecord).filter(
        models.SwapRecord.swap_time >= datetime.combine(today, datetime.min.time())
    ).count()
    
    from sqlalchemy import func
    avg_health = db.query(func.avg(models.Battery.health_score)).scalar() or 0
    scrapped = db.query(models.Battery).filter(models.Battery.status == "scrapped").count()

    return schemas.StatsOverview(
        total_cabinets=total_cabinets,
        online_cabinets=online_cabinets,
        total_batteries=total_batteries,
        active_batteries=active_batteries,
        pending_orders=pending_orders,
        today_swaps=today_swaps,
        avg_health_score=round(avg_health, 1),
        scrapped_batteries=scrapped
    )


@app.get("/api/stats/fault-rate")
def get_fault_rate(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    total_slots = db.query(models.Slot).count()
    fault_slots = db.query(models.Slot).filter(models.Slot.status == "fault").count()
    
    fault_orders = db.query(models.WorkOrder).filter(models.WorkOrder.type == "fault").count()
    total_orders = db.query(models.WorkOrder).count()
    
    return {
        "slot_fault_rate": round(fault_slots / total_slots * 100, 2) if total_slots > 0 else 0,
        "fault_order_rate": round(fault_orders / total_orders * 100, 2) if total_orders > 0 else 0,
        "total_slots": total_slots,
        "fault_slots": fault_slots,
        "total_orders": total_orders,
        "fault_orders": fault_orders
    }


@app.get("/api/stats/scrap-warning")
def get_scrap_warning(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    batteries = db.query(models.Battery).filter(
        models.Battery.health_score < 70,
        models.Battery.status != "scrapped"
    ).order_by(models.Battery.health_score.asc()).all()
    
    warning_levels = []
    for bat in batteries:
        level = "high" if bat.health_score < 50 else "medium" if bat.health_score < 60 else "low"
        warning_levels.append({
            "battery_no": bat.battery_no,
            "health_score": bat.health_score,
            "cycle_count": bat.cycle_count,
            "warning_level": level
        })
    
    return {
        "total_warning": len(batteries),
        "high_warning": sum(1 for w in warning_levels if w["warning_level"] == "high"),
        "medium_warning": sum(1 for w in warning_levels if w["warning_level"] == "medium"),
        "low_warning": sum(1 for w in warning_levels if w["warning_level"] == "low"),
        "batteries": warning_levels[:20]
    }


@app.get("/api/stats/swap-efficiency")
def get_swap_efficiency(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from sqlalchemy import func
    
    records = db.query(models.SwapRecord).all()
    
    daily_stats = {}
    for r in records:
        date_key = r.swap_time.strftime("%Y-%m-%d")
        if date_key not in daily_stats:
            daily_stats[date_key] = 0
        daily_stats[date_key] += 1
    
    sorted_dates = sorted(daily_stats.keys())
    last_7_days = sorted_dates[-7:] if len(sorted_dates) >= 7 else sorted_dates
    
    completed_orders = db.query(models.WorkOrder).filter(
        models.WorkOrder.status == "completed"
    ).all()
    
    avg_completion_time = 0
    if completed_orders:
        total_hours = 0
        for o in completed_orders:
            if o.completed_at and o.created_at:
                total_hours += (o.completed_at - o.created_at).total_seconds() / 3600
        avg_completion_time = round(total_hours / len(completed_orders), 2)
    
    return {
        "total_swaps": len(records),
        "daily_average": round(len(records) / max(len(daily_stats), 1), 1),
        "last_7_days": [{"date": d, "count": daily_stats[d]} for d in last_7_days],
        "avg_completion_hours": avg_completion_time
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
