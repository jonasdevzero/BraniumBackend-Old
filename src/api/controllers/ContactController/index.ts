import { getRepository } from 'typeorm';
import { ServerRequest, ServerReply } from '../../interfaces/controller';
import { Contact } from '../../models';
import ContactService from '../../services/ContactService';
import socketEmit from '../../websocket/emit';

export default {
    async show(req: ServerRequest, reply: ServerReply) {
        try {
            const id = req.user;
            const contact_id = req.params.id;

            const contactRepository = getRepository(Contact);
            const contact = await contactRepository.findOne({
                where: { user_id: id, contact_user_id: contact_id },
                relations: ['contact'],
            });

            if (!contact)
                return reply
                    .status(404)
                    .send({ message: 'Contato não encontrado!' });

            reply.status(200).send({ contact });
        } catch (error: any) {
            reply.status(error.status).send(error);
        }
    },

    async invite(req: ServerRequest, reply: ServerReply) {
        try {
            const id = req.user.toString();
            const contact_id = req.params.id;

            const invite = await ContactService.inviteUser(id, contact_id);

            socketEmit.contact.invite(invite);
            reply.status(201).send({ message: 'ok' });
        } catch (error: any) {
            reply.status(error.status).send(error);
        }
    },

    async acceptInvite(req: ServerRequest, reply: ServerReply) {
        try {
            const id = req.user.toString();
            const invitation_id = req.params.invite;

            const [contact, selfContact] = await ContactService.acceptInvite(
                id,
                invitation_id,
            );

            socketEmit.contact.acceptInvite(contact, selfContact);
            reply.status(201).send({ contact });
        } catch (error: any) {
            reply.status(error.status).send(error);
        }
    },

    async refuseInvite(req: ServerRequest, reply: ServerReply) {
        try {
            const id = req.user as string;
            const invitation_id = req.params.invite;

            const invitation = await ContactService.refuseInvite(
                id,
                invitation_id,
            );

            socketEmit.contact.refuseInvite(invitation);
            reply.status(200).send({ message: 'ok' });
        } catch (error: any) {
            reply.status(error.status).send(error);
        }
    },

    async block(req: ServerRequest, reply: ServerReply) {
        try {
            const id = req.user.toString();
            const contact_id = req.params.id;

            const [contact, selfContact] = await ContactService.toggleBlock(
                id,
                contact_id,
            );

            socketEmit.contact.block(contact, selfContact);
            reply.status(200).send({ you_blocked: !contact.you_blocked });
        } catch (error: any) {
            reply.status(error.status).send(error);
        }
    },
};
