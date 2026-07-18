import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerDisplayNameListResponse, PeerDisplayNameResponse } from '../models/chat.models';
import { ChatRepository } from '../repositories/chat.repository';

@Injectable({ providedIn: 'root' })
export class ChatPeerDisplayNameService {
  private readonly repo = inject(ChatRepository);

  setDisplayName(
    conversationId: string,
    targetUserId: string,
    displayName: string,
  ): Observable<PeerDisplayNameResponse> {
    return this.repo.setPeerDisplayName(conversationId, targetUserId, displayName);
  }

  clearDisplayName(
    conversationId: string,
    targetUserId: string,
  ): Observable<PeerDisplayNameResponse> {
    return this.repo.clearPeerDisplayName(conversationId, targetUserId);
  }

  listDisplayNames(conversationId: string): Observable<PeerDisplayNameListResponse> {
    return this.repo.listPeerDisplayNames(conversationId);
  }
}
