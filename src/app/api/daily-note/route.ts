import { NextResponse ,NextRequest} from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest){

  try{
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    console.log(token)
  
    const userId = token?.githubId;

    if(!userId){
      return NextResponse.json(
        {error: `Unauthorized`},
        {status: 400}
      );
    }

    const today = new Date();
    const todayDate = today.toISOString().split("T")[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() -1);

    const yesterdayDate = yesterday.toISOString().split("T")[0];

    const {data : todayData} = await supabaseAdmin
    .from("daily_notes")
    .select("*")
    .eq("user_id",userId)
    .eq("date",todayDate)
    .single();

    const {data : yesterdayData} = await supabaseAdmin
    .from("daily_notes")
    .select("*")
    .eq("user_id",userId)
    .eq("date",yesterdayDate)
    .single();
    console.log(todayData,yesterdayData);
    return NextResponse.json({
      todayNote: todayData?.note || "",
      yesterdayNote: yesterdayData?.note || "",
    });

  }catch(error){
    return NextResponse.json(
      {error: `Something went wrong `},
    {status: 500}
    );
    
  }
}

export async function POST(req: NextRequest) {
 try{

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  console.log(token)

  const userId = token?.githubId;
  const body = await req.json();
  console.log(body);
  const { note} = body;
  if(!userId){
    console.log("no user id");
    return NextResponse.json(
      {error: "User id is requied "},
      {status: 400}
    );
  }
  if(!note || !note.trim()){
    console.log("no note ");
    return NextResponse.json(
      {error: "Note cannot be empty"},
      {status: 400}
    );
  }
  if(note.length >280){
    console.log("max len ");
    return NextResponse.json(
      {error: "Maximum 280 characters allowed"},
      {status: 400}
    );
  }
  const today = new Date().toISOString().split("T")[0];
  const {data, error} = await supabaseAdmin
  .from("daily_notes")
  .upsert({
    user_id: userId,
    date: today,
    note: note.trim(),
  },{
    onConflict:"user_id,date"
  })
  .select()
  .single();
  if(error){
    console.log(error.message);
    return NextResponse.json(
      {error: error.message},
      {status:500}
    );
  }
   console.log(data);
  return NextResponse.json(data);
 }catch(error){
  console.log(error);
  return NextResponse.json(
    {error: "Something went wrong"},
    {status:500}
  );
 }
}