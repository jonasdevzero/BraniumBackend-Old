import { FastifyInstance } from 'fastify';
import { Socket } from 'socket.io';
import { getRepository } from 'typeorm';
import { User } from '../models';
import SocketUsers from './users';
import * as Actions from './actions';

export const wsUsers = new SocketUsers();

export async function socketConnection(
    socket: Socket,
    fastify: FastifyInstance,
) {
    try {
        const jwt = socket.handshake.query.jwt as string;

        if (!jwt) {
            socket.emit('auth', 'Não autorizado!');
            return socket.disconnect();
        }

        const id: string = await new Promise((resolve, reject) => {
            fastify.jwt.verify(jwt, (err: any, decoded: any) =>
                !err ? resolve(decoded.id) : reject(err),
            );
        });
        const userRepository = getRepository(User);
        const user = await userRepository.findOne(id, {
            relations: ['contacts'],
        });

        if (!user) {
            socket.emit('auth', 'Usuário não encontrado');
            return socket.disconnect();
        }

        socket.join(id);
        wsUsers.set(id, { socket, user });
        const contactsOnline = wsUsers.getContactsOnline(id);

        wsUsers.emitToContacts(
            id,
            'update',
            Actions.update('UPDATE_ROOM', {
                field: 'contacts',
                where: { id },
                set: { online: true },
            }),
        );

        socket.emit(
            'auth',
            null,
            Actions.update('SET_CONTACTS_ONLINE', {
                set: { contacts: contactsOnline },
            }),
        );
        socket.emit(
            'warn',
            Actions.warn('info', `Bem-vindo, ${user.username}`),
        );

        /* Event listeners */

        socket.on('is-online', (contact_id, callback) =>
            callback(!!wsUsers.get(contact_id)),
        );

        socket.on('disconnect', () => {
            wsUsers.emitToContacts(
                id,
                'update',
                Actions.update('UPDATE_ROOM', {
                    field: 'contacts',
                    where: { id },
                    set: { online: false },
                }),
            );
            wsUsers.remove(id);
        });
    } catch (error) {
        socket.emit('ready', error);
        socket.disconnect();
    }
}
