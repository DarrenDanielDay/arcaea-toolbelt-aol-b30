import "./style.css";

export const CheckBox = (props: JSX.IntrinsicElements["input"]) => {
  return (
    <div >
      <input type="checkbox" class="fancy" {...props}></input>
      <label class="fancy" for={props.id}>{props.children}</label>
    </div>
  );
};
