"use client";

import React, { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserDetailContext } from "@/context/UserDetailContext";

function Provider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const createUser = useMutation(api.users.createUser);
  
  const createNewUser = async () => {
    if (user){
        const result =await createUser({
          email: user.primaryEmailAddress?.emailAddress ?? "",
          imageUrl: user.imageUrl ?? "",
          name: user.fullName ?? "",
        });
        console.log(result); 
    }
  };

  useEffect(() => {
    user && createNewUser();
  }, [user]);

  return (
    <UserDetailContext.Provider value={{ user }}>
      {children}
    </UserDetailContext.Provider>
  );
}

export default Provider;
