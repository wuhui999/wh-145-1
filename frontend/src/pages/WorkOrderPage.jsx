import React, { useState, useEffect } from 'react'
import { 
  Table, 
  Select, 
  Button, 
  Space, 
  Modal, 
  Form,
  Input,
  Tag,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Dropdown,
  Menu
} from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { workOrderAPI, cabinetAPI, userAPI, batteryAPI } from '../services/api'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const WorkOrderPage = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: ''
  })
  const [createVisible, setCreateVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cabinets, setCabinets] = useState([])
  const [operators, setOperators] = useState([])
  const [form] = Form.useForm()

  useEffect(() => {
    loadOrders()
    loadOptions()
  }, [filters])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.type) params.type = filters.type
      if (filters.priority) params.priority = filters.priority
      const data = await workOrderAPI.list(params)
      setOrders(data)
    } catch (error) {
      message.error('加载工单列表失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadOptions = async () => {
    try {
      const [cabData, userData] = await Promise.all([
        cabinetAPI.list(),
        userAPI.list({ role: 'operator' })
      ])
      setCabinets(cabData)
      setOperators(userData)
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreate = async (values) => {
    try {
      await workOrderAPI.create(values)
      message.success('工单创建成功')
      setCreateVisible(false)
      form.resetFields()
      loadOrders()
    } catch (error) {
      message.error('创建失败')
      console.error(error)
    }
  }

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await workOrderAPI.update(orderId, { status })
      message.success('状态更新成功')
      loadOrders()
      if (detailVisible) {
        const detail = await workOrderAPI.get(orderId)
        setSelectedOrder(detail)
      }
    } catch (error) {
      message.error('更新失败')
      console.error(error)
    }
  }

  const handleAssign = async (orderId, userId) => {
    try {
      await workOrderAPI.update(orderId, { assigned_to: userId, status: 'assigned' })
      message.success('派单成功')
      loadOrders()
    } catch (error) {
      message.error('派单失败')
      console.error(error)
    }
  }

  const handleViewDetail = async (id) => {
    setDetailVisible(true)
    try {
      const data = await workOrderAPI.get(id)
      setSelectedOrder(data)
    } catch (error) {
      message.error('加载详情失败')
    }
  }

  const getTypeInfo = (type) => {
    const map = {
      low_battery: { text: '低电量', color: 'orange', icon: <WarningOutlined /> },
      fault: { text: '故障', color: 'red', icon: <WarningOutlined /> },
      complaint: { text: '投诉', color: 'purple', icon: <WarningOutlined /> }
    }
    return map[type] || { text: type, color: 'default', icon: null }
  }

  const getPriorityInfo = (priority) => {
    const map = {
      urgent: { text: '紧急', color: 'red' },
      high: { text: '高', color: 'orange' },
      normal: { text: '普通', color: 'blue' },
      low: { text: '低', color: 'green' }
    }
    return map[priority] || { text: priority, color: 'default' }
  }

  const getStatusInfo = (status) => {
    const map = {
      pending: { text: '待处理', color: 'default' },
      assigned: { text: '已派单', color: 'blue' },
      in_progress: { text: '处理中', color: 'orange' },
      completed: { text: '已完成', color: 'green' },
      cancelled: { text: '已取消', color: 'default' }
    }
    return map[status] || { text: status, color: 'default' }
  }

  const isSlaBreached = (order) => {
    if (order.status === 'completed' || order.status === 'cancelled') return false
    if (!order.sla_deadline) return false
    return dayjs().isAfter(dayjs(order.sla_deadline))
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const inProgressCount = orders.filter(o => ['assigned', 'in_progress'].includes(o.status)).length
  const completedCount = orders.filter(o => o.status === 'completed').length
  const urgentCount = orders.filter(o => o.priority === 'urgent' && o.status !== 'completed').length

  const columns = [
    {
      title: '工单编号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 160,
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const info = getTypeInfo(type)
        return <Tag color={info.color}>{info.icon} {info.text}</Tag>
      }
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority) => {
        const info = getPriorityInfo(priority)
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '柜机',
      dataIndex: 'cabinet',
      key: 'cabinet',
      width: 150,
      render: (cab) => cab?.name || '-'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => {
        const info = getStatusInfo(status)
        return (
          <div>
            <Tag color={info.color}>{info.text}</Tag>
            {isSlaBreached(record) && (
              <Tag color="red">SLA超时</Tag>
            )}
          </div>
        )
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record.id)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <Dropdown
              menu={{
                items: operators.map(op => ({
                  key: op.id,
                  label: op.full_name,
                  onClick: () => handleAssign(record.id, op.id)
                }))
              }}
            >
              <Button type="link" size="small">派单</Button>
            </Dropdown>
          )}
          {(record.status === 'assigned' || record.status === 'in_progress') && (
            <Button 
              type="link" 
              size="small"
              onClick={() => handleUpdateStatus(record.id, 'completed')}
            >
              完成
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <h2 className="page-title">工单管理</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="待处理" 
              value={pendingCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="处理中" 
              value={inProgressCount}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="已完成" 
              value={completedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="紧急工单" 
              value={urgentCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Select 
              placeholder="状态筛选" 
              style={{ width: 140 }}
              value={filters.status || undefined}
              onChange={(val) => setFilters({ ...filters, status: val || '' })}
              allowClear
            >
              <Option value="pending">待处理</Option>
              <Option value="assigned">已派单</Option>
              <Option value="in_progress">处理中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
            <Select 
              placeholder="类型筛选" 
              style={{ width: 140 }}
              value={filters.type || undefined}
              onChange={(val) => setFilters({ ...filters, type: val || '' })}
              allowClear
            >
              <Option value="low_battery">低电量</Option>
              <Option value="fault">故障</Option>
              <Option value="complaint">投诉</Option>
            </Select>
            <Select 
              placeholder="优先级" 
              style={{ width: 120 }}
              value={filters.priority || undefined}
              onChange={(val) => setFilters({ ...filters, priority: val || '' })}
              allowClear
            >
              <Option value="urgent">紧急</Option>
              <Option value="high">高</Option>
              <Option value="normal">普通</Option>
              <Option value="low">低</Option>
            </Select>
          </Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateVisible(true)}
          >
            新建工单
          </Button>
        </div>

        <Table 
          columns={columns} 
          dataSource={orders} 
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`
          }}
        />
      </Card>

      <Modal
        title="新建工单"
        open={createVisible}
        onCancel={() => setCreateVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="type" label="工单类型" rules={[{ required: true }]}>
            <Select>
              <Option value="low_battery">低电量</Option>
              <Option value="fault">故障</Option>
              <Option value="complaint">投诉</Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
            <Select>
              <Option value="low">低</Option>
              <Option value="normal">普通</Option>
              <Option value="high">高</Option>
              <Option value="urgent">紧急</Option>
            </Select>
          </Form.Item>
          <Form.Item name="cabinet_id" label="柜机" rules={[{ required: true }]}>
            <Select placeholder="请选择柜机">
              {cabinets.map(cab => (
                <Option key={cab.id} value={cab.id}>{cab.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="问题描述">
            <TextArea rows={4} placeholder="请描述问题详情" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">创建</Button>
              <Button onClick={() => setCreateVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="工单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedOrder && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag color={getPriorityInfo(selectedOrder.priority).color}>
                  {getPriorityInfo(selectedOrder.priority).text}
                </Tag>
                <Tag color={getTypeInfo(selectedOrder.type).color}>
                  {getTypeInfo(selectedOrder.type).text}
                </Tag>
                <Tag color={getStatusInfo(selectedOrder.status).color}>
                  {getStatusInfo(selectedOrder.status).text}
                </Tag>
              </Space>
            </div>
            
            <p style={{ color: '#666', marginBottom: 16 }}>{selectedOrder.description}</p>
            
            <div style={{ fontSize: 13, color: '#666' }}>
              <p>工单编号：<strong>{selectedOrder.order_no}</strong></p>
              <p>柜机：{selectedOrder.cabinet?.name}</p>
              <p>创建时间：{dayjs(selectedOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
              <p>SLA截止：{dayjs(selectedOrder.sla_deadline).format('YYYY-MM-DD HH:mm:ss')}</p>
              {selectedOrder.completed_at && (
                <p>完成时间：{dayjs(selectedOrder.completed_at).format('YYYY-MM-DD HH:mm:ss')}</p>
              )}
            </div>

            {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <Space>
                  {selectedOrder.status === 'pending' && (
                    <Dropdown
                      menu={{
                        items: operators.map(op => ({
                          key: op.id,
                          label: `派单给 ${op.full_name}`,
                          onClick: () => handleAssign(selectedOrder.id, op.id)
                        }))
                      }}
                    >
                      <Button type="primary">派单</Button>
                    </Dropdown>
                  )}
                  {(selectedOrder.status === 'assigned' || selectedOrder.status === 'in_progress') && (
                    <Button 
                      type="primary" 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                    >
                      标记完成
                    </Button>
                  )}
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default WorkOrderPage
