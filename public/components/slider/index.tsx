import "./style.css";

export const Slider = (props: JSX.IntrinsicElements["input"]) => {
  return (
    <div class="slider">
      <label for={props.id}>{props.children}</label>
      <input type="range" class="fancy" {...props}></input>
    </div>
  );
};
