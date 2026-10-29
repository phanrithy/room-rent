import { roomService } from '../services/room.service.js';

export function listRooms(req, res, next) {
  try {
    const result = roomService.listRooms(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getRoom(req, res, next) {
  try {
    const room = roomService.getRoom(parseInt(req.params.id, 10));
    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export function getFloors(req, res, next) {
  try {
    const propertyId = req.query.propertyId ? parseInt(req.query.propertyId, 10) : null;
    const floors = roomService.getFloors(propertyId);
    res.json({ floors });
  } catch (err) {
    next(err);
  }
}

export function createRoom(req, res, next) {
  try {
    const room = roomService.createRoom(req.user.id, req.body);
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
}

export function updateRoom(req, res, next) {
  try {
    const room = roomService.updateRoom(req.user.id, parseInt(req.params.id, 10), req.body);
    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export function deleteRoom(req, res, next) {
  try {
    const result = roomService.deleteRoom(req.user.id, parseInt(req.params.id, 10));
    res.json(result);
  } catch (err) {
    next(err);
  }
}
