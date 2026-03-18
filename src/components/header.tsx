import AuthMenu from "@/components/authMenu";
import Link from "next/link";

export async function Header() {
    return (
        <header className="border-b border-gray-300 bg-background">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold">30x30</Link>
                <AuthMenu />
            </div>
        </header>
    );
}