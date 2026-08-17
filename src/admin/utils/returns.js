const eventFor = (status, timestamp, note = '') => ({
  status,
  note,
  timestamp: new Date(timestamp).toISOString(),
})

export function createReturnRequest(
  order,
  details,
  timestamp = new Date(),
) {
  const createdAt = new Date(timestamp)
  return {
    id: `RET-${createdAt.getTime()}-${String(order.id).replace(/^ORD-?/i, '')}`,
    orderId: order.id,
    customer: order.customer,
    email: order.email || '',
    items: order.items || [],
    amount: order.total,
    reason: details.reason,
    images: details.images || [],
    status: 'Requested',
    resolution: '',
    refundStatus: 'Not Requested',
    inspectionResult: '',
    requestedAt: createdAt.toISOString(),
    history: [eventFor('Requested', createdAt, 'Return request submitted')],
  }
}

export function initializeReturnRequests(orders) {
  return orders
    .filter((order) => ['Returned', 'Refunded'].includes(order.status))
    .map((order) => {
      const timestamp = new Date(`${order.date}T12:00:00`)
      return {
        ...createReturnRequest(
          order,
          { reason: order.returnReason || 'Existing return record', images: [] },
          timestamp,
        ),
        status: 'Completed',
        resolution: order.status === 'Refunded' ? 'Refund' : 'Return',
        refundStatus:
          order.status === 'Refunded' ? 'Completed' : 'Not Requested',
        inspectionResult: order.returnDisposition || 'Recorded',
        history: [eventFor('Completed', timestamp, 'Imported return record')],
      }
    })
}

const transitions = {
  approve: {
    from: ['Requested'],
    status: 'Approved',
    note: 'Return request approved',
  },
  reject: {
    from: ['Requested'],
    status: 'Rejected',
    note: 'Return request rejected',
  },
  schedule_pickup: {
    from: ['Approved'],
    status: 'Pickup Scheduled',
    note: 'Return pickup scheduled',
  },
  receive_product: {
    from: ['Pickup Scheduled'],
    status: 'Product Received',
    note: 'Returned product received',
  },
  inspect: {
    from: ['Product Received'],
    status: 'Inspected',
    note: 'Product inspection completed',
  },
  request_refund: {
    from: ['Inspected'],
    status: 'Refund Requested',
    resolution: 'Refund',
    refundStatus: 'Requested',
    note: 'Refund requested after inspection',
  },
  start_refund: {
    from: ['Refund Requested'],
    status: 'Refund Processing',
    resolution: 'Refund',
    refundStatus: 'Processing',
    note: 'Refund processing started',
  },
  complete_refund: {
    from: ['Refund Processing'],
    status: 'Completed',
    resolution: 'Refund',
    refundStatus: 'Completed',
    note: 'Refund completed',
  },
  create_replacement: {
    from: ['Inspected'],
    status: 'Replacement Processing',
    resolution: 'Replacement',
    note: 'Replacement order created',
  },
  complete_replacement: {
    from: ['Replacement Processing'],
    status: 'Completed',
    resolution: 'Replacement',
    note: 'Replacement completed',
  },
}

export function transitionReturnRequest(
  requests,
  requestId,
  action,
  options = {},
  timestamp = new Date(),
) {
  const transition = transitions[action]
  const request = requests.find((item) => item.id === requestId)
  if (!request || !transition || !transition.from.includes(request.status)) {
    return { requests, updatedRequest: null, error: 'Return action is unavailable.' }
  }
  const updatedRequest = {
    ...request,
    status: transition.status,
    ...(transition.resolution
      ? { resolution: transition.resolution }
      : {}),
    ...(transition.refundStatus
      ? { refundStatus: transition.refundStatus }
      : {}),
    ...(action === 'reject' ? { rejectionReason: options.note || '' } : {}),
    ...(action === 'schedule_pickup'
      ? { pickupReference: options.pickupReference || '' }
      : {}),
    ...(action === 'inspect'
      ? { inspectionResult: options.inspectionResult || 'Damaged' }
      : {}),
    history: [
      ...(request.history || []),
      eventFor(transition.status, timestamp, options.note || transition.note),
    ],
  }
  return {
    requests: requests.map((item) =>
      item.id === requestId ? updatedRequest : item,
    ),
    updatedRequest,
    error: '',
  }
}
