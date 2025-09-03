import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { Inject } from '@nestjs/common';
import { REDIS } from '../../infra/redis/redis.module';

@WebSocketGateway({ namespace: '/ws', cors: { origin: true, credentials: true } })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly PRESENCE_TTL = 30; // secondes

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async handleConnection(client: Socket) {
    // Auth light: token & userId passés en query (on branchera avec JWT plus tard)
    const userId = (client.handshake.query.userId as string) || client.id;

    // marquer présence (clé expirable)
    await this.redis.setex(`presence:${userId}`, this.PRESENCE_TTL, 'online');
    client.data.userId = userId;

    // option: rejoindre une room fournie en query ?room=xyz
    const room = client.handshake.query.room as string | undefined;
    if (room) await client.join(room);

    // notifier le client /ws:connected
    client.emit('ws:connected', { userId });
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      // présence "gracieuse" (laisser expirer naturellement est ok aussi)
      await this.redis.setex(`presence:${userId}`, this.PRESENCE_TTL, 'offline');
    }
  }

  // Heartbeat
  @SubscribeMessage('ping')
  onPing(@ConnectedSocket() client: Socket, @MessageBody() data?: any) {
    client.emit('pong', { ok: true, echo: data ?? null, t: Date.now() });
  }

  // Join/leave rooms
  @SubscribeMessage('room:join')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { room: string }) {
    await client.join(payload.room);
    client.emit('room:joined', payload);
  }

  @SubscribeMessage('room:leave')
  async onLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: { room: string }) {
    await client.leave(payload.room);
    client.emit('room:left', payload);
  }

  // Broadcast message dans une room
  @SubscribeMessage('message:send')
  async onMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: { room: string; content: string }) {
    const from = (client.data.userId as string) || client.id;
    this.server.to(payload.room).emit('message:new', { room: payload.room, from, content: payload.content, at: Date.now() });
    return { delivered: true };
  }
}
