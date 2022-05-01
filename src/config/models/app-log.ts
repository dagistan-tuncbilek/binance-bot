export class AppLog {
    id: number;
    context: string | null;
    level: string;
    stack: any;
    message: string | null;
    timestamp: Date;
}