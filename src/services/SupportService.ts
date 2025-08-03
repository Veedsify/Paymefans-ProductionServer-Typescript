import query from "@utils/prisma";
import { nanoid } from "nanoid";

interface CreateSupportTicketData {
    userId?: number;
    subject: string;
    message: string;
    name: string;
    email: string;
}

export default class SupportService {
    /**
     * Create a new support ticket
     */
    static async CreateSupportTicket(data: CreateSupportTicketData) {
        try {
            const { userId, subject, message } = data;

            // Generate unique ticket ID
            const ticketId = `TICKET-${nanoid(10).toUpperCase()}`;

            // If user is not authenticated, create a help contact entry
            if (!userId) {
                // For unauthenticated users, we'll create a simple help contact
                // You might want to create a separate table for anonymous contacts
                return {
                    error: true,
                    message: "User must be authenticated to create support ticket",
                };
            }

            // Create support ticket
            const ticket = await query.supportTickets.create({
                data: {
                    ticket_id: ticketId,
                    user_id: userId,
                    subject,
                    message,
                    status: "open",
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            username: true,
                            profile_image: true,
                        },
                    },
                },
            });

            // Send notification email to admin (optional)
            // You can implement email notification service here

            return {
                error: false,
                message: "Support ticket created successfully",
                data: {
                    ticket_id: ticket.ticket_id,
                    subject: ticket.subject,
                    message: ticket.message,
                    status: ticket.status,
                    created_at: ticket.created_at,
                    user: ticket.user,
                },
            };
        } catch (error: any) {
            console.error("Error in CreateSupportTicket:", error.message);
            return {
                error: true,
                message: "Failed to create support ticket",
            };
        }
    }

    /**
     * Get user's support tickets
     */
    static async GetUserSupportTickets(userId: number, page: number = 1, limit: number = 10) {
        try {
            const skip = (page - 1) * limit;

            const [tickets, totalCount] = await Promise.all([
                query.supportTickets.findMany({
                    where: {
                        user_id: userId,
                    },
                    orderBy: {
                        created_at: "desc",
                    },
                    skip,
                    take: limit,
                    include: {
                        SupportTicketReplies: {
                            orderBy: {
                                created_at: "asc",
                            },
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        profile_image: true,
                                    },
                                },
                            },
                        },
                    },
                }),
                query.supportTickets.count({
                    where: {
                        user_id: userId,
                    },
                }),
            ]);

            const totalPages = Math.ceil(totalCount / limit);

            return {
                error: false,
                message: "Support tickets retrieved successfully",
                data: {
                    tickets,
                    pagination: {
                        current_page: page,
                        total_pages: totalPages,
                        total_count: totalCount,
                        per_page: limit,
                        has_next: page < totalPages,
                        has_prev: page > 1,
                    },
                },
            };
        } catch (error: any) {
            console.error("Error in GetUserSupportTickets:", error.message);
            return {
                error: true,
                message: "Failed to retrieve support tickets",
            };
        }
    }

    /**
     * Get a specific support ticket by ticket ID
     */
    static async GetSupportTicket(ticketId: string, userId?: number) {
        try {
            const whereClause: any = {
                ticket_id: ticketId,
            };

            // If userId is provided, ensure the ticket belongs to the user
            if (userId) {
                whereClause.user_id = userId;
            }

            const ticket = await query.supportTickets.findFirst({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            username: true,
                            profile_image: true,
                        },
                    },
                    SupportTicketReplies: {
                        orderBy: {
                            created_at: "asc",
                        },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    profile_image: true,
                                    admin: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!ticket) {
                return {
                    error: true,
                    message: "Support ticket not found",
                };
            }

            return {
                error: false,
                message: "Support ticket retrieved successfully",
                data: ticket,
            };
        } catch (error: any) {
            console.error("Error in GetSupportTicket:", error.message);
            return {
                error: true,
                message: "Failed to retrieve support ticket",
            };
        }
    }

    /**
     * Reply to a support ticket
     */
    static async ReplySupportTicket(ticketId: string, userId: number, message: string) {
        try {
            // First check if ticket exists and user has access to it
            const ticket = await query.supportTickets.findFirst({
                where: {
                    ticket_id: ticketId,
                    user_id: userId,
                },
            });

            if (!ticket) {
                return {
                    error: true,
                    message: "Support ticket not found or access denied",
                };
            }

            // Create reply
            const reply = await query.supportTicketReplies.create({
                data: {
                    ticket_id: ticketId,
                    user_id: userId,
                    message,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            profile_image: true,
                        },
                    },
                },
            });

            // Update ticket status to indicate user has replied
            await query.supportTickets.update({
                where: {
                    ticket_id: ticketId,
                },
                data: {
                    status: "pending",
                    updated_at: new Date(),
                },
            });

            return {
                error: false,
                message: "Reply added successfully",
                data: reply,
            };
        } catch (error: any) {
            console.error("Error in ReplySupportTicket:", error.message);
            return {
                error: true,
                message: "Failed to add reply to support ticket",
            };
        }
    }

    /**
     * Close a support ticket
     */
    static async CloseSupportTicket(ticketId: string, userId: number) {
        try {
            // Check if ticket exists and user has access to it
            const ticket = await query.supportTickets.findFirst({
                where: {
                    ticket_id: ticketId,
                    user_id: userId,
                },
            });

            if (!ticket) {
                return {
                    error: true,
                    message: "Support ticket not found or access denied",
                };
            }

            // Update ticket status to closed
            const updatedTicket = await query.supportTickets.update({
                where: {
                    ticket_id: ticketId,
                },
                data: {
                    status: "closed",
                    updated_at: new Date(),
                },
            });

            return {
                error: false,
                message: "Support ticket closed successfully",
                data: {
                    ticket_id: updatedTicket.ticket_id,
                    status: updatedTicket.status,
                    updated_at: updatedTicket.updated_at,
                },
            };
        } catch (error: any) {
            console.error("Error in CloseSupportTicket:", error.message);
            return {
                error: true,
                message: "Failed to close support ticket",
            };
        }
    }

    /**
     * Get all support tickets (Admin only)
     */
    static async GetAllSupportTickets(page: number = 1, limit: number = 10, status?: string) {
        try {
            const skip = (page - 1) * limit;
            const whereClause: any = {};

            if (status) {
                whereClause.status = status;
            }

            const [tickets, totalCount] = await Promise.all([
                query.supportTickets.findMany({
                    where: whereClause,
                    orderBy: {
                        created_at: "desc",
                    },
                    skip,
                    take: limit,
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                username: true,
                                profile_image: true,
                            },
                        },
                        SupportTicketReplies: {
                            orderBy: {
                                created_at: "asc",
                            },
                            take: 1, // Only get the latest reply for listing
                        },
                    },
                }),
                query.supportTickets.count({
                    where: whereClause,
                }),
            ]);

            const totalPages = Math.ceil(totalCount / limit);

            return {
                error: false,
                message: "Support tickets retrieved successfully",
                data: {
                    tickets,
                    pagination: {
                        current_page: page,
                        total_pages: totalPages,
                        total_count: totalCount,
                        per_page: limit,
                        has_next: page < totalPages,
                        has_prev: page > 1,
                    },
                },
            };
        } catch (error: any) {
            console.error("Error in GetAllSupportTickets:", error.message);
            return {
                error: true,
                message: "Failed to retrieve support tickets",
            };
        }
    }
}
