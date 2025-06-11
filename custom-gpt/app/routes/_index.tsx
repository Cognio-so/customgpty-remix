import { useNavigate } from "@remix-run/react";

export default function Index() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/login");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Welcome to Custom GPT </h1>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={handleGetStarted}
      >
        Login
      </button>
    </div>
  );
}